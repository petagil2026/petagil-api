import { BadRequestException, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../../prisma/prisma.service'
import { VetTimeOffService } from './vet-timeoff.service'

describe('VetTimeOffService', () => {
  let service: VetTimeOffService
  let prisma: {
    vetProfile: { findUnique: jest.Mock }
    vetTimeOff: {
      findMany: jest.Mock
      create: jest.Mock
      findUnique: jest.Mock
      delete: jest.Mock
    }
  }

  beforeEach(() => {
    prisma = {
      vetProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'vp-1' }) },
      vetTimeOff: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    }
    service = new VetTimeOffService(prisma as unknown as PrismaService)
  })

  it('findAll lista por vetProfileId ordenado por startsAt asc', async () => {
    prisma.vetTimeOff.findMany.mockResolvedValue([])
    await service.findAll('user-1')
    expect(prisma.vetTimeOff.findMany).toHaveBeenCalledWith({
      where: { vetProfileId: 'vp-1' },
      orderBy: { startsAt: 'asc' },
    })
  })

  it('create rejeita endsAt < startsAt', async () => {
    await expect(
      service.create('user-1', {
        startsAt: '2026-07-02T03:00:00.000Z',
        endsAt: '2026-07-01T03:00:00.000Z',
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('create rejeita folga acima do teto de duração [F5]', async () => {
    await expect(
      service.create('user-1', {
        startsAt: '2026-01-01T03:00:00.000Z',
        endsAt: '2027-06-01T03:00:00.000Z', // ~517 dias
        allDay: true,
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('create normaliza allDay/reason ausentes', async () => {
    prisma.vetTimeOff.create.mockResolvedValue({ id: 'to-1' })
    await service.create('user-1', {
      startsAt: '2026-07-01T03:00:00.000Z',
      endsAt: '2026-07-02T03:00:00.000Z',
    })
    expect(prisma.vetTimeOff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ vetProfileId: 'vp-1', allDay: false, reason: null }),
    })
  })

  it('remove lança NotFound para folga de outro vet', async () => {
    prisma.vetTimeOff.findUnique.mockResolvedValue({ id: 'to-1', vetProfileId: 'outro' })
    await expect(service.remove('user-1', 'to-1')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.vetTimeOff.delete).not.toHaveBeenCalled()
  })

  it('remove deleta e retorna { ok: true } para folga do próprio vet', async () => {
    prisma.vetTimeOff.findUnique.mockResolvedValue({ id: 'to-1', vetProfileId: 'vp-1' })
    prisma.vetTimeOff.delete.mockResolvedValue({})
    const res = await service.remove('user-1', 'to-1')
    expect(res).toEqual({ ok: true })
    expect(prisma.vetTimeOff.delete).toHaveBeenCalledWith({ where: { id: 'to-1' } })
  })
})
