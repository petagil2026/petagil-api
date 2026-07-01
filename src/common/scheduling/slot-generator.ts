import { minutesToHhmm } from './time.util'

/**
 * Gerador de slots — função PURA, sem Prisma, sem `Date` de instante, sem offset
 * e sem nada de "vet". Recebe a entrada já normalizada pelo chamador:
 *
 * - `rule.periods` e `localBlocks` já vêm em **minutos-locais por dia** (o SERVICE
 *   resolve o fuso na borda — convenção 3 da spec).
 * - `localBlocks` são intervalos bloqueados, **um por data** (`allDay` já expandido
 *   para `[0,1440)` e blocos multi-dia já fatiados por data pelo service).
 *
 * Implementa as convenções 1, 2 e 4 (parte de minutos) da spec:
 * - índice do dia da semana via `getUTCDay()` da data `YYYY-MM-DD` → `(getUTCDay()+6)%7`
 *   (0=Segunda … 6=Domingo), NUNCA `getDay()` [R1];
 * - flooring por período (descarta a sobra menor que a duração) [F11];
 * - overlap aberto-fechado estrito: slot `[sStart, sEnd)` colide com bloco
 *   `[bStart, bEnd)` sse `sStart < bEnd && sEnd > bStart` [F6];
 * - contrato com TODOS os dias do range (dias sem disponibilidade com `slots: []`),
 *   em ordem crescente de data [F7].
 */

export interface SlotRule {
  /** 0=Segunda … 6=Domingo (ordem da UI). */
  weekdays: number[]
  /** Períodos habilitados, em minutos-locais do dia. */
  periods: { startMinute: number; endMinute: number }[]
  /** Duração da consulta em minutos (∈ {20,30,45,60}). */
  slotDurationMin: number
}

/** Intervalo bloqueado em minutos-locais, atrelado a UMA data `YYYY-MM-DD`. */
export interface LocalBlock {
  date: string
  startMinute: number
  endMinute: number
}

export interface SlotRange {
  /** `YYYY-MM-DD` inclusivo. */
  from: string
  /** `YYYY-MM-DD` inclusivo. */
  to: string
}

export interface DaySlots {
  date: string
  slots: { start: string; end: string }[]
}

export interface SlotsResult {
  days: DaySlots[]
}

/** Índice do dia da semana na ordem da UI (0=Seg … 6=Dom) a partir de `YYYY-MM-DD`. */
export function weekdayIndexFromDate(date: string): number {
  // Em UTC para não depender do fuso da máquina [R1].
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

/** Lista as datas `YYYY-MM-DD` de `from` a `to` (inclusivo), em ordem crescente. */
function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function generateSlots(
  rule: SlotRule,
  localBlocks: LocalBlock[],
  range: SlotRange
): SlotsResult {
  const weekdaySet = new Set(rule.weekdays)
  // Períodos em ordem crescente garantem slots já ordenados por dia.
  const periods = [...rule.periods].sort((a, b) => a.startMinute - b.startMinute)

  // Index dos blocos por data para lookup O(1) por dia.
  const blocksByDate = new Map<string, LocalBlock[]>()
  for (const b of localBlocks) {
    const list = blocksByDate.get(b.date)
    if (list) list.push(b)
    else blocksByDate.set(b.date, [b])
  }

  const days: DaySlots[] = enumerateDates(range.from, range.to).map(date => {
    const idx = weekdayIndexFromDate(date)
    if (!weekdaySet.has(idx)) {
      return { date, slots: [] }
    }
    const blocks = blocksByDate.get(date) ?? []
    const slots: { start: string; end: string }[] = []
    for (const period of periods) {
      // Flooring: avança de slotDurationMin enquanto o slot inteiro cabe no período [F11].
      for (
        let s = period.startMinute;
        s + rule.slotDurationMin <= period.endMinute;
        s += rule.slotDurationMin
      ) {
        const e = s + rule.slotDurationMin
        // Overlap aberto-fechado estrito contra os blocos da data [F6].
        const blocked = blocks.some(b => s < b.endMinute && e > b.startMinute)
        if (!blocked) {
          slots.push({ start: minutesToHhmm(s), end: minutesToHhmm(e) })
        }
      }
    }
    return { date, slots }
  })

  return { days }
}
