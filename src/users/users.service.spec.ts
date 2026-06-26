import { ConflictException } from '@nestjs/common'
import { Prisma, Role, User } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'

function makeUser(o: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Maria',
    email: 'maria@petagil.app',
    passwordHash: 'hash',
    phone: '+55 11 99999-0000',
    city: 'São Paulo',
    role: Role.TUTOR,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...o,
  }
}

describe('UsersService', () => {
  let service: UsersService
  let prisma: {
    user: {
      findUnique: jest.Mock
      create: jest.Mock
      update: jest.Mock
    }
    tutorProfile: {
      updateMany: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tutorProfile: {
        updateMany: jest.fn(),
      },
      // Array form: executa os ops (já invocados eagerly) e resolve seus valores.
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    }
    service = new UsersService(prisma as unknown as PrismaService)
  })

  describe('createWithProfile', () => {
    const baseData = {
      name: 'Maria',
      email: 'maria@petagil.app',
      passwordHash: 'hash',
      phone: '+55 11 99999-0000',
      city: 'São Paulo',
    }

    it('AC1: role TUTOR cria User com tutorProfile aninhado herdando phone/city', async () => {
      prisma.user.create.mockResolvedValue(makeUser())

      await service.createWithProfile({ ...baseData, role: Role.TUTOR })

      expect(prisma.user.create).toHaveBeenCalledTimes(1)
      const arg = prisma.user.create.mock.calls[0][0] as {
        data: { tutorProfile?: { create: { whatsapp: string; city: string } } }
      }
      expect(arg.data.tutorProfile).toEqual({
        create: { whatsapp: '+55 11 99999-0000', city: 'São Paulo' },
      })
    })

    it('AC2: role VET cria User SEM tutorProfile', async () => {
      prisma.user.create.mockResolvedValue(makeUser({ role: Role.VET }))

      await service.createWithProfile({ ...baseData, role: Role.VET })

      const arg = prisma.user.create.mock.calls[0][0] as { data: { tutorProfile?: unknown } }
      expect(arg.data.tutorProfile).toBeUndefined()
    })

    it('AC2: role PASSEADOR cria User SEM tutorProfile', async () => {
      prisma.user.create.mockResolvedValue(makeUser({ role: Role.PASSEADOR }))

      await service.createWithProfile({ ...baseData, role: Role.PASSEADOR })

      const arg = prisma.user.create.mock.calls[0][0] as { data: { tutorProfile?: unknown } }
      expect(arg.data.tutorProfile).toBeUndefined()
    })

    it('AC7: P2002 (corrida no unique email) vira ConflictException', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: { target: ['email'] },
      })
      prisma.user.create.mockRejectedValue(p2002)

      await expect(
        service.createWithProfile({ ...baseData, role: Role.TUTOR })
      ).rejects.toBeInstanceOf(ConflictException)
    })

    it('repassa erros não-P2002 sem traduzir', async () => {
      const boom = new Error('db down')
      prisma.user.create.mockRejectedValue(boom)

      await expect(service.createWithProfile({ ...baseData, role: Role.TUTOR })).rejects.toBe(boom)
    })

    it('F6: P2002 em unique que NÃO é email é repassado (não vira Conflict de email)', async () => {
      const p2002Other = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: { target: ['some_other_unique'] },
      })
      prisma.user.create.mockRejectedValue(p2002Other)

      await expect(service.createWithProfile({ ...baseData, role: Role.TUTOR })).rejects.toBe(
        p2002Other
      )
    })
  })

  describe('updateProfile', () => {
    it('AC8: propaga phone/city ao tutorProfile via updateMany', async () => {
      prisma.user.update.mockResolvedValue(makeUser())
      prisma.tutorProfile.updateMany.mockResolvedValue({ count: 1 })

      await service.updateProfile('user-1', { phone: '+55 21 88888-0000', city: 'Rio' })

      expect(prisma.tutorProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { whatsapp: '+55 21 88888-0000', city: 'Rio' },
      })
    })

    it('AC8: só city presente → updateMany só com city', async () => {
      prisma.user.update.mockResolvedValue(makeUser())
      prisma.tutorProfile.updateMany.mockResolvedValue({ count: 1 })

      await service.updateProfile('user-1', { city: 'Rio' })

      expect(prisma.tutorProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { city: 'Rio' },
      })
    })

    it('AC9: sem phone/city (só name) → não chama updateMany', async () => {
      prisma.user.update.mockResolvedValue(makeUser())

      await service.updateProfile('user-1', { name: 'Nova Maria' })

      expect(prisma.tutorProfile.updateMany).not.toHaveBeenCalled()
    })

    it('AC9: updateMany no-op (count 0) quando não há perfil, sem erro', async () => {
      prisma.user.update.mockResolvedValue(makeUser({ role: Role.VET }))
      prisma.tutorProfile.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.updateProfile('user-1', { phone: '+55 21 88888-0000' })
      ).resolves.toBeDefined()
    })
  })
})
