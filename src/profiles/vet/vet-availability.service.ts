import { BadRequestException, Injectable } from '@nestjs/common'
import { AvailabilityPeriod, Prisma } from '@prisma/client'

import { generateSlots } from '../../common/scheduling/slot-generator'
import type { SlotsResult } from '../../common/scheduling/slot-generator'
import { hhmmToMinutes, minutesToHhmm } from '../../common/scheduling/time.util'
import { toLocalBlocks } from '../../common/scheduling/timezone.util'
import { PrismaService } from '../../prisma/prisma.service'
import { SlotsQueryDto } from './dto/slots-query.dto'
import { UpsertVetAvailabilityDto } from './dto/upsert-vet-availability.dto'
import { resolveVetProfileId } from './vet-profile.util'

/** Default único da duração (espelhado no schema `@default(30)` e no app). */
export const DEFAULT_SLOT_DURATION_MIN = 30

/** Teto do intervalo de geração de slots (dias). */
const MAX_SLOTS_RANGE_DAYS = 60

/** Forma da disponibilidade exposta na API — horários como "HH:MM". */
export interface PublicAvailability {
  weekdays: number[]
  slotDurationMin: number
  periods: { period: string; start: string; end: string }[]
}

@Injectable()
export class VetAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Carrega a disponibilidade do vet; forma vazia padrão se ainda não houver. */
  async findMine(userId: string): Promise<PublicAvailability> {
    const vetProfileId = await resolveVetProfileId(this.prisma, userId)
    const availability = await this.prisma.vetAvailability.findUnique({
      where: { vetProfileId },
      include: { periods: true },
    })
    if (!availability) {
      return { weekdays: [], slotDurationMin: DEFAULT_SLOT_DURATION_MIN, periods: [] }
    }
    return this.serialize(availability.weekdays, availability.slotDurationMin, availability.periods)
  }

  /** Substitui a regra inteira (weekdays + duração + períodos) numa transação. */
  async upsert(userId: string, dto: UpsertVetAvailabilityDto): Promise<PublicAvailability> {
    const vetProfileId = await resolveVetProfileId(this.prisma, userId)

    // Consistência: ou tudo vazio (sem disponibilidade) ou ambos preenchidos —
    // dias sem períodos (ou o inverso) geram uma regra "morta". [F3]
    const noWeekdays = dto.weekdays.length === 0
    const noPeriods = dto.periods.length === 0
    if (noWeekdays !== noPeriods) {
      throw new BadRequestException('Disponibilidade incompleta: informe dias e períodos')
    }

    // Período duplicado detectado ANTES do banco (não depender só do P2002). [F3]
    const seen = new Set<string>()
    for (const p of dto.periods) {
      if (seen.has(p.period)) {
        throw new BadRequestException(`Período duplicado: ${p.period}`)
      }
      seen.add(p.period)
    }

    // Valida cada período (fim > início) antes de tocar o banco.
    const periods = dto.periods.map(p => {
      const startMinute = hhmmToMinutes(p.start)
      const endMinute = hhmmToMinutes(p.end)
      if (endMinute <= startMinute) {
        throw new BadRequestException(`Período ${p.period}: horário final deve ser após o inicial`)
      }
      return { period: p.period, startMinute, endMinute }
    })

    // Períodos não podem se sobrepor entre si (senão gera slots duplicados). [F4]
    const sorted = [...periods].sort((a, b) => a.startMinute - b.startMinute)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinute < sorted[i - 1].endMinute) {
        throw new BadRequestException('Períodos de atendimento não podem se sobrepor')
      }
    }

    try {
      await this.prisma.$transaction(async tx => {
        // (1) upsert da regra 1:1 e captura do id.
        const availability = await tx.vetAvailability.upsert({
          where: { vetProfileId },
          create: { vetProfileId, weekdays: dto.weekdays, slotDurationMin: dto.slotDurationMin },
          update: { weekdays: dto.weekdays, slotDurationMin: dto.slotDurationMin },
        })
        // (2) limpa períodos antigos e (3) recria os novos — nesta ordem.
        await tx.vetAvailabilityPeriod.deleteMany({ where: { availabilityId: availability.id } })
        await tx.vetAvailabilityPeriod.createMany({
          data: periods.map(p => ({
            availabilityId: availability.id,
            period: p.period,
            startMinute: p.startMinute,
            endMinute: p.endMinute,
          })),
        })
      })
    } catch (e) {
      // period duplicado viola @@unique([availabilityId, period]) (rede de segurança).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Período duplicado na disponibilidade')
      }
      throw e
    }

    // [F9] Re-serializa a partir do estado PERSISTIDO (não ecoa o DTO) — garante
    // que a resposta de `upsert` e a de `findMine` sejam idênticas em forma.
    return this.findMine(userId)
  }

  /**
   * Gera os slots livres para um intervalo: carrega dados, resolve o fuso na borda
   * e delega o cálculo ao util puro (`generateSlots`). Não persiste nada.
   */
  async getSlots(userId: string, query: SlotsQueryDto): Promise<SlotsResult> {
    // [F2] Resolve o perfil PRIMEIRO: user sem vetProfile → 404 (AC13),
    // consistente com findMine/upsert, antes de validar o range (400).
    const vetProfileId = await resolveVetProfileId(this.prisma, userId)

    const from = query.from.slice(0, 10)
    const to = query.to.slice(0, 10)

    const fromMs = new Date(`${from}T00:00:00Z`).getTime()
    const toMs = new Date(`${to}T00:00:00Z`).getTime()
    if (toMs < fromMs) {
      throw new BadRequestException('"to" deve ser maior ou igual a "from"')
    }
    const days = Math.round((toMs - fromMs) / 86_400_000) + 1
    if (days > MAX_SLOTS_RANGE_DAYS) {
      throw new BadRequestException(`Intervalo máximo de ${MAX_SLOTS_RANGE_DAYS} dias`)
    }

    const availability = await this.prisma.vetAvailability.findUnique({
      where: { vetProfileId },
      include: { periods: true },
    })

    // [F1] Janela UTC com folga de 1 dia em cada borda — 1 dia (1440min) excede
    // com sobra qualquer offset de fuso (|offset| ≤ 24h), então mesmo se o offset
    // fixo de `toLocalBlocks` mudar, nenhuma folga de borda escapa do fetch.
    const windowStart = new Date(fromMs - 86_400_000)
    const windowEnd = new Date(toMs + 2 * 86_400_000)
    const timeoffs = await this.prisma.vetTimeOff.findMany({
      where: { vetProfileId, startsAt: { lt: windowEnd }, endsAt: { gt: windowStart } },
    })

    const rule = {
      weekdays: availability?.weekdays ?? [],
      periods: (availability?.periods ?? []).map(p => ({
        startMinute: p.startMinute,
        endMinute: p.endMinute,
      })),
      slotDurationMin: availability?.slotDurationMin ?? DEFAULT_SLOT_DURATION_MIN,
    }
    const localBlocks = toLocalBlocks(timeoffs)

    return generateSlots(rule, localBlocks, { from, to })
  }

  private serialize(
    weekdays: number[],
    slotDurationMin: number,
    periods: { period: string; startMinute: number; endMinute: number }[]
  ): PublicAvailability {
    return {
      weekdays,
      slotDurationMin,
      periods: periods.map(p => ({
        period: p.period,
        start: minutesToHhmm(p.startMinute),
        end: minutesToHhmm(p.endMinute),
      })),
    }
  }
}
