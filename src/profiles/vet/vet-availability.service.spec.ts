import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { toLocalBlocks } from '../../common/scheduling/timezone.util'
import { PrismaService } from '../../prisma/prisma.service'
import { DEFAULT_SLOT_DURATION_MIN, VetAvailabilityService } from './vet-availability.service'

describe('VetAvailabilityService', () => {
  let service: VetAvailabilityService
  let prisma: {
    vetProfile: { findUnique: jest.Mock }
    vetAvailability: { findUnique: jest.Mock; upsert: jest.Mock }
    vetAvailabilityPeriod: { deleteMany: jest.Mock; createMany: jest.Mock }
    vetTimeOff: { findMany: jest.Mock }
    $transaction: jest.Mock
  }

  beforeEach(() => {
    prisma = {
      vetProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'vp-1' }) },
      vetAvailability: { findUnique: jest.fn(), upsert: jest.fn() },
      vetAvailabilityPeriod: { deleteMany: jest.fn(), createMany: jest.fn() },
      vetTimeOff: { findMany: jest.fn().mockResolvedValue([]) },
      // Executa o callback passando o próprio mock como `tx`.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    }
    service = new VetAvailabilityService(prisma as unknown as PrismaService)
  })

  it('findMine retorna forma vazia padrão quando não há disponibilidade', async () => {
    prisma.vetAvailability.findUnique.mockResolvedValue(null)
    const res = await service.findMine('user-1')
    expect(res).toEqual({ weekdays: [], slotDurationMin: DEFAULT_SLOT_DURATION_MIN, periods: [] })
  })

  it('findMine serializa minutos → "HH:MM"', async () => {
    prisma.vetAvailability.findUnique.mockResolvedValue({
      weekdays: [0, 1],
      slotDurationMin: 30,
      periods: [{ period: 'MORNING', startMinute: 480, endMinute: 720 }],
    })
    const res = await service.findMine('user-1')
    expect(res.periods[0]).toEqual({ period: 'MORNING', start: '08:00', end: '12:00' })
  })

  it('findMine lança NotFound quando o user não tem perfil de vet', async () => {
    prisma.vetProfile.findUnique.mockResolvedValue(null)
    await expect(service.findMine('user-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('upsert converte "HH:MM"→minutos e substitui períodos (delete→create na transação)', async () => {
    prisma.vetAvailability.upsert.mockResolvedValue({ id: 'av-1' })
    await service.upsert('user-1', {
      weekdays: [0, 1],
      slotDurationMin: 30,
      periods: [{ period: 'MORNING', start: '08:00', end: '12:00' }],
    })
    expect(prisma.vetAvailability.upsert).toHaveBeenCalled()
    expect(prisma.vetAvailabilityPeriod.deleteMany).toHaveBeenCalledWith({
      where: { availabilityId: 'av-1' },
    })
    expect(prisma.vetAvailabilityPeriod.createMany).toHaveBeenCalledWith({
      data: [{ availabilityId: 'av-1', period: 'MORNING', startMinute: 480, endMinute: 720 }],
    })
    // ordem: delete antes de create
    const deleteOrder = prisma.vetAvailabilityPeriod.deleteMany.mock.invocationCallOrder[0]
    const createOrder = prisma.vetAvailabilityPeriod.createMany.mock.invocationCallOrder[0]
    expect(deleteOrder).toBeLessThan(createOrder)
  })

  it('upsert rejeita disponibilidade incompleta (dias sem períodos) [F3]', async () => {
    await expect(
      service.upsert('user-1', { weekdays: [0, 1], slotDurationMin: 30, periods: [] })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('upsert rejeita período duplicado no payload (antes do banco) [F3]', async () => {
    await expect(
      service.upsert('user-1', {
        weekdays: [0],
        slotDurationMin: 30,
        periods: [
          { period: 'MORNING', start: '08:00', end: '10:00' },
          { period: 'MORNING', start: '10:00', end: '12:00' },
        ],
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('upsert rejeita períodos sobrepostos [F4]', async () => {
    await expect(
      service.upsert('user-1', {
        weekdays: [0],
        slotDurationMin: 30,
        periods: [
          { period: 'MORNING', start: '08:00', end: '14:00' },
          { period: 'AFTERNOON', start: '12:00', end: '18:00' },
        ],
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('upsert aceita forma vazia (sem dias e sem períodos)', async () => {
    prisma.vetAvailability.upsert.mockResolvedValue({ id: 'av-1' })
    prisma.vetAvailability.findUnique.mockResolvedValue(null)
    const res = await service.upsert('user-1', { weekdays: [], slotDurationMin: 30, periods: [] })
    expect(res).toEqual({ weekdays: [], slotDurationMin: 30, periods: [] })
  })

  it('upsert rejeita período com fim <= início', async () => {
    await expect(
      service.upsert('user-1', {
        weekdays: [0],
        slotDurationMin: 30,
        periods: [{ period: 'MORNING', start: '12:00', end: '08:00' }],
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('upsert mapeia P2002 (período duplicado) para BadRequest', async () => {
    prisma.vetAvailability.upsert.mockResolvedValue({ id: 'av-1' })
    prisma.vetAvailabilityPeriod.createMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' })
    )
    await expect(
      service.upsert('user-1', {
        weekdays: [0],
        slotDurationMin: 30,
        periods: [{ period: 'MORNING', start: '08:00', end: '12:00' }],
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  describe('getSlots', () => {
    it('rejeita to < from', async () => {
      await expect(
        service.getSlots('user-1', { from: '2026-06-29', to: '2026-06-28' })
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejeita intervalo > 60 dias', async () => {
      await expect(
        service.getSlots('user-1', { from: '2026-01-01', to: '2026-12-31' })
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('delega ao util e zera o dia coberto por folga allDay (AC7)', async () => {
      prisma.vetAvailability.findUnique.mockResolvedValue({
        weekdays: [0],
        slotDurationMin: 30,
        periods: [{ period: 'MORNING', startMinute: 480, endMinute: 720 }],
      })
      // allDay em America/Sao_Paulo: 00:00 local do dia 29 = 03:00Z; fim 03:00Z do dia 30.
      prisma.vetTimeOff.findMany.mockResolvedValue([
        {
          startsAt: new Date('2026-06-29T03:00:00.000Z'),
          endsAt: new Date('2026-06-30T03:00:00.000Z'),
          allDay: true,
        },
      ])
      const res = await service.getSlots('user-1', { from: '2026-06-29', to: '2026-06-29' })
      expect(res.days[0].slots).toEqual([])
    })
  })
})

describe('toLocalBlocks (resolução de fuso, [R2])', () => {
  it('folga allDay de um dia (03:00Z–03:00Z+1) → [{ date: dia, 0–1440 }] sem vazar', () => {
    const blocks = toLocalBlocks([
      {
        startsAt: new Date('2026-06-29T03:00:00.000Z'),
        endsAt: new Date('2026-06-30T03:00:00.000Z'),
        allDay: true,
      },
    ])
    expect(blocks).toEqual([{ date: '2026-06-29', startMinute: 0, endMinute: 1440 }])
  })

  it('bloqueio que cruza a meia-noite local é fatiado em 2 blocos por data', () => {
    // 22:00 local dia 29 (01:00Z dia 30) até 02:00 local dia 30 (05:00Z dia 30).
    const blocks = toLocalBlocks([
      {
        startsAt: new Date('2026-06-30T01:00:00.000Z'),
        endsAt: new Date('2026-06-30T05:00:00.000Z'),
        allDay: false,
      },
    ])
    expect(blocks).toEqual([
      { date: '2026-06-29', startMinute: 1320, endMinute: 1440 }, // 22:00–24:00
      { date: '2026-06-30', startMinute: 0, endMinute: 120 }, // 00:00–02:00
    ])
  })

  it('faixa de horário no mesmo dia (14:00–16:00 local)', () => {
    const blocks = toLocalBlocks([
      {
        startsAt: new Date('2026-06-29T17:00:00.000Z'), // 14:00 local
        endsAt: new Date('2026-06-29T19:00:00.000Z'), // 16:00 local
        allDay: false,
      },
    ])
    expect(blocks).toEqual([{ date: '2026-06-29', startMinute: 840, endMinute: 960 }])
  })
})
