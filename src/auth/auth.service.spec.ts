import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Role, User } from '@prisma/client'
import * as argon2 from 'argon2'

import { UsersService } from '../users/users.service'
import { AuthService } from './auth.service'

interface UsersMock {
  findByEmail: jest.Mock
  findById: jest.Mock
  create: jest.Mock
}

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'access-secret-0123456789abcd',
  JWT_REFRESH_SECRET: 'refresh-secret-0123456789abcd',
  JWT_ACCESS_TTL: '900s',
  JWT_REFRESH_TTL: '30d',
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Maria',
    email: 'maria@petagil.app',
    passwordHash: 'hash',
    phone: null,
    city: null,
    role: Role.TUTOR,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('AuthService', () => {
  let service: AuthService
  let users: UsersMock
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock }

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    }
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      verifyAsync: jest.fn(),
    }
    const config = {
      get: (k: string): string | undefined => ENV[k],
      getOrThrow: (k: string): string => ENV[k],
    }

    service = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService
    )
  })

  describe('register', () => {
    it('hasheia a senha e emite os 3 tokens + user público (role minúsculo)', async () => {
      users.findByEmail.mockResolvedValue(null)
      users.create.mockImplementation(
        (data: { passwordHash: string; role: Role }): User =>
          makeUser({ passwordHash: data.passwordHash, role: data.role })
      )

      const result = await service.register({
        name: 'Maria',
        email: 'maria@petagil.app',
        password: 'Petagil123',
        role: 'tutor',
      })

      expect(users.create).toHaveBeenCalledTimes(1)
      const createArg = users.create.mock.calls[0][0] as { passwordHash: string }
      expect(createArg.passwordHash).not.toBe('Petagil123')
      expect(createArg.passwordHash.startsWith('$argon2')).toBe(true)

      expect(result.access_token).toBe('signed.jwt.token')
      expect(result.id_token).toBe('signed.jwt.token')
      expect(result.refresh_token).toBe('signed.jwt.token')
      expect(result.expires_in).toBe(900)
      expect(result.user.role).toBe('tutor')
      expect(Object.keys(result.user)).not.toContain('passwordHash')
      expect(jwt.signAsync).toHaveBeenCalledTimes(3)
    })

    it('rejeita email duplicado com ConflictException (409)', async () => {
      users.findByEmail.mockResolvedValue(makeUser())
      await expect(
        service.register({
          name: 'X',
          email: 'maria@petagil.app',
          password: 'Petagil123',
          role: 'tutor',
        })
      ).rejects.toBeInstanceOf(ConflictException)
      expect(users.create).not.toHaveBeenCalled()
    })
  })

  describe('validateUser / login', () => {
    it('rejeita senha errada (UnauthorizedException genérica)', async () => {
      const passwordHash = await argon2.hash('correta')
      users.findByEmail.mockResolvedValue(makeUser({ passwordHash }))
      await expect(service.validateUser('maria@petagil.app', 'errada')).rejects.toBeInstanceOf(
        UnauthorizedException
      )
    })

    it('rejeita email inexistente (mesma exceção)', async () => {
      users.findByEmail.mockResolvedValue(null)
      await expect(service.validateUser('nao@existe.app', 'qualquer')).rejects.toBeInstanceOf(
        UnauthorizedException
      )
    })

    it('login retorna tokens quando a senha confere', async () => {
      const passwordHash = await argon2.hash('Petagil123')
      users.findByEmail.mockResolvedValue(makeUser({ passwordHash }))
      const result = await service.login({ email: 'maria@petagil.app', password: 'Petagil123' })
      expect(result.access_token).toBe('signed.jwt.token')
      expect(result.user.email).toBe('maria@petagil.app')
    })
  })

  describe('refresh', () => {
    it('rejeita refresh token inválido/expirado', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'))
      await expect(service.refresh({ refresh_token: 'bad' })).rejects.toBeInstanceOf(
        UnauthorizedException
      )
    })

    it('reemite access/id/expires_in para refresh válido', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', type: 'refresh' })
      users.findById.mockResolvedValue(makeUser())
      const result = await service.refresh({ refresh_token: 'good' })
      expect(result.access_token).toBe('signed.jwt.token')
      expect(result.id_token).toBe('signed.jwt.token')
      expect(result.expires_in).toBe(900)
    })

    it('F1: rejeita token sem claim type:refresh (mesmo com sub válido)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' }) // sem `type`
      await expect(
        service.refresh({ refresh_token: 'access-usado-como-refresh' })
      ).rejects.toBeInstanceOf(UnauthorizedException)
      expect(users.findById).not.toHaveBeenCalled()
    })
  })
})
