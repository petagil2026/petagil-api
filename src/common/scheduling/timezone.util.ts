import type { LocalBlock } from './slot-generator'

/**
 * Offset fixo de America/Sao_Paulo (UTC−3), sem DST — convenção 3 da spec.
 * É a ÚNICA peça que conhece o fuso; o `generateSlots` permanece timezone-free.
 * Revisitar quando entrar `Appointment` (fuso por vet/cidade).
 */
export const SAO_PAULO_OFFSET_MIN = -180

interface LocalInstant {
  date: string
  minute: number
}

/** Converte um instante UTC para data local (`YYYY-MM-DD`) + minuto-do-dia local. */
function toLocal(instant: Date, offsetMin: number): LocalInstant {
  const shifted = new Date(instant.getTime() + offsetMin * 60_000)
  return {
    date: shifted.toISOString().slice(0, 10),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

/** `YYYY-MM-DD` + n dias (em UTC). */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Lista as datas de `from` a `to` (inclusivo). */
function datesBetween(from: string, to: string): string[] {
  const out: string[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/** Folga como vem do banco (só os campos relevantes ao cálculo de fuso). */
export interface TimeOffInstant {
  startsAt: Date
  endsAt: Date
  allDay: boolean
}

/**
 * Resolve o fuso na borda: converte folgas (instantes UTC) em `LocalBlock`s
 * (minutos-locais, UM por data). `allDay` é expandido para `[0,1440)` de cada dia
 * coberto (fim inclusivo do último dia); blocos que cruzam a meia-noite local são
 * fatiados em um bloco por data. Overlap aberto-fechado (`endMinute` exclusivo)
 * fica a cargo do `generateSlots` — convenção 4 [F6].
 */
export function toLocalBlocks(
  timeoffs: TimeOffInstant[],
  offsetMin: number = SAO_PAULO_OFFSET_MIN
): LocalBlock[] {
  const blocks: LocalBlock[] = []
  for (const t of timeoffs) {
    const start = toLocal(t.startsAt, offsetMin)
    const end = toLocal(t.endsAt, offsetMin)
    const sDate = start.date
    let sMin = start.minute
    let eDate = end.date
    let eMin = end.minute

    if (t.allDay) {
      sMin = 0
      // Qualquer minuto além da meia-noite no fim → o último dia conta inteiro.
      if (eMin > 0) {
        eDate = addDays(eDate, 1)
        eMin = 0
      }
    }

    for (const d of datesBetween(sDate, eDate)) {
      const dayStart = d === sDate ? sMin : 0
      const dayEnd = d === eDate ? eMin : 1440
      if (dayEnd > dayStart) {
        blocks.push({ date: d, startMinute: dayStart, endMinute: dayEnd })
      }
    }
  }
  return blocks
}
