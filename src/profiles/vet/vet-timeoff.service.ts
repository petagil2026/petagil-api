import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { VetTimeOff } from '@prisma/client'

import { PrismaService } from '../../prisma/prisma.service'
import { CreateVetTimeOffDto } from './dto/create-vet-timeoff.dto'
import { resolveVetProfileId } from './vet-profile.util'

/** Teto de duração de uma folga (dias) — evita expansão ilimitada em `toLocalBlocks`. */
const MAX_TIMEOFF_DAYS = 366

@Injectable()
export class VetTimeOffService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista as folgas do vet, da mais antiga para a mais recente. */
  async findAll(userId: string): Promise<VetTimeOff[]> {
    const vetProfileId = await resolveVetProfileId(this.prisma, userId)
    return this.prisma.vetTimeOff.findMany({
      where: { vetProfileId },
      orderBy: { startsAt: 'asc' },
    })
  }

  /** Cria uma folga; valida `endsAt >= startsAt`. */
  async create(userId: string, dto: CreateVetTimeOffDto): Promise<VetTimeOff> {
    const vetProfileId = await resolveVetProfileId(this.prisma, userId)
    const startsAt = new Date(dto.startsAt)
    const endsAt = new Date(dto.endsAt)
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new BadRequestException('"endsAt" deve ser maior ou igual a "startsAt"')
    }
    // [F5] Teto de duração: bloqueio gigante explodiria `toLocalBlocks` (1 bloco/dia).
    if (endsAt.getTime() - startsAt.getTime() > MAX_TIMEOFF_DAYS * 86_400_000) {
      throw new BadRequestException(`Folga não pode exceder ${MAX_TIMEOFF_DAYS} dias`)
    }
    return this.prisma.vetTimeOff.create({
      data: {
        vetProfileId,
        startsAt,
        endsAt,
        allDay: dto.allDay ?? false,
        reason: dto.reason ?? null,
      },
    })
  }

  /** Remove uma folga do próprio vet (404 se não existir ou for de outro). */
  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const vetProfileId = await resolveVetProfileId(this.prisma, userId)
    const timeoff = await this.prisma.vetTimeOff.findUnique({ where: { id } })
    if (!timeoff || timeoff.vetProfileId !== vetProfileId) {
      throw new NotFoundException('Folga não encontrada')
    }
    await this.prisma.vetTimeOff.delete({ where: { id } })
    return { ok: true }
  }
}
