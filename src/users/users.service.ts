import { Injectable, NotFoundException } from '@nestjs/common'
import { Role, User } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

/** Papel exposto na API (sempre minúsculo), espelhando o `Role` do app. */
export type ApiRole = 'tutor' | 'vet' | 'passeador'

/**
 * Forma "pública" do usuário — o que vaza para fora da API.
 * Espelha o `User` que o app tipa: { sub, id?, email, name, role }.
 * NUNCA inclui `passwordHash`.
 */
export interface PublicUser {
  sub: string
  id: string
  email: string
  name: string
  role: ApiRole
}

/** Converte o enum do Prisma para o papel da API (minúsculo). */
export function toApiRole(role: Role): ApiRole {
  switch (role) {
    case Role.VET:
      return 'vet'
    case Role.PASSEADOR:
      return 'passeador'
    default:
      return 'tutor'
  }
}

/** Converte o papel da API (minúsculo) para o enum do Prisma. */
export function toRoleEnum(role: ApiRole): Role {
  switch (role) {
    case 'vet':
      return Role.VET
    case 'passeador':
      return Role.PASSEADOR
    default:
      return Role.TUTOR
  }
}

/** Serializa um `User` do Prisma para a forma pública (sem `passwordHash`). */
export function toPublicUser(user: User): PublicUser {
  return {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: toApiRole(user.role),
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }
    return user
  }

  create(data: {
    name: string
    email: string
    passwordHash: string
    role: Role
    phone?: string
    city?: string
  }): Promise<User> {
    return this.prisma.user.create({ data })
  }

  /** Atualização parcial dos dados que o próprio usuário pode editar. */
  updateProfile(
    userId: string,
    data: { name?: string; phone?: string; city?: string }
  ): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data })
  }
}
