import { generateSlots, weekdayIndexFromDate } from './slot-generator'
import type { LocalBlock, SlotRule } from './slot-generator'
import { hhmmToMinutes, minutesToHhmm } from './time.util'

describe('time.util', () => {
  it('hhmmToMinutes / minutesToHhmm round-trip + zero-padding', () => {
    expect(hhmmToMinutes('08:00')).toBe(480)
    expect(hhmmToMinutes('00:00')).toBe(0)
    expect(hhmmToMinutes('23:59')).toBe(1439)
    expect(minutesToHhmm(480)).toBe('08:00')
    expect(minutesToHhmm(0)).toBe('00:00')
    expect(minutesToHhmm(540)).toBe('09:00') // zero-padded na hora
    expect(minutesToHhmm(hhmmToMinutes('08:30'))).toBe('08:30')
  })
})

describe('weekdayIndexFromDate [R1]', () => {
  it('2026-06-29 (segunda) → getUTCDay()=1 → idx=0', () => {
    expect(weekdayIndexFromDate('2026-06-29')).toBe(0)
  })
  it('2026-07-05 (domingo) → idx=6', () => {
    expect(weekdayIndexFromDate('2026-07-05')).toBe(6)
  })
})

const MORNING: SlotRule = {
  weekdays: [0], // segunda
  periods: [{ startMinute: 480, endMinute: 720 }], // 08:00–12:00
  slotDurationMin: 30,
}

describe('generateSlots', () => {
  it('AC5: segunda 08:00–12:00 / 30min → 8 slots', () => {
    const res = generateSlots(MORNING, [], { from: '2026-06-29', to: '2026-06-29' })
    expect(res.days).toHaveLength(1)
    expect(res.days[0].slots).toHaveLength(8)
    expect(res.days[0].slots[0]).toEqual({ start: '08:00', end: '08:30' })
    expect(res.days[0].slots[7]).toEqual({ start: '11:30', end: '12:00' })
  })

  it('AC5b/F11: janela 08:00–12:10 / 30min → 8 slots (descarta os 10min finais)', () => {
    const rule: SlotRule = { ...MORNING, periods: [{ startMinute: 480, endMinute: 730 }] }
    const res = generateSlots(rule, [], { from: '2026-06-29', to: '2026-06-29' })
    expect(res.days[0].slots).toHaveLength(8)
    expect(res.days[0].slots.some(s => s.start === '12:00')).toBe(false)
  })

  it('AC6/F6: folga 09:00–10:00 remove 09:00–09:30 e 09:30–10:00, mantém 08:30–09:00', () => {
    const blocks: LocalBlock[] = [{ date: '2026-06-29', startMinute: 540, endMinute: 600 }]
    const res = generateSlots(MORNING, blocks, { from: '2026-06-29', to: '2026-06-29' })
    const starts = res.days[0].slots.map(s => s.start)
    expect(starts).toContain('08:30') // termina no início da folga → permanece
    expect(starts).not.toContain('09:00')
    expect(starts).not.toContain('09:30')
    expect(starts).toContain('10:00') // começa no fim da folga → permanece
  })

  it('AC7: folga dia inteiro (00:00–24:00) zera o dia', () => {
    const blocks: LocalBlock[] = [{ date: '2026-06-29', startMinute: 0, endMinute: 1440 }]
    const res = generateSlots(MORNING, blocks, { from: '2026-06-29', to: '2026-06-29' })
    expect(res.days[0].slots).toEqual([])
  })

  it('AC7b/F7: contrato traz TODOS os dias do range, dias sem disponibilidade com slots:[]', () => {
    // 2026-06-29 (seg) a 2026-07-05 (dom) = 7 dias; só segunda habilitada.
    const res = generateSlots(MORNING, [], { from: '2026-06-29', to: '2026-07-05' })
    expect(res.days).toHaveLength(7)
    expect(res.days.map(d => d.date)).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ])
    expect(res.days[0].slots).toHaveLength(8) // segunda
    expect(res.days[1].slots).toEqual([]) // terça sem disponibilidade
  })

  it('períodos fora de ordem saem com slots crescentes', () => {
    const rule: SlotRule = {
      weekdays: [0],
      slotDurationMin: 60,
      periods: [
        { startMinute: 840, endMinute: 960 }, // 14:00–16:00
        { startMinute: 480, endMinute: 600 }, // 08:00–10:00
      ],
    }
    const res = generateSlots(rule, [], { from: '2026-06-29', to: '2026-06-29' })
    expect(res.days[0].slots.map(s => s.start)).toEqual(['08:00', '09:00', '14:00', '15:00'])
  })
})
