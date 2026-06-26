import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, Role, User } from '@prisma/client'

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

  /**
   * Cria o `User` e, quando `role === TUTOR`, o `TutorProfile` numa única
   * operação atômica via nested write do Prisma (uma transação implícita
   * server-side — atômica e segura com pgBouncer, sem `$transaction`
   * interativo). `whatsapp`/`city` herdam `phone`/`city` (validados no
   * RegisterDto, F5). Se o nested write falhar, o Prisma faz rollback — não há
   * `User` órfão (AC3).
   */
  async createWithProfile(data: {
    name: string
    email: string
    passwordHash: string
    role: Role
    phone: string
    city: string
  }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          phone: data.phone,
          city: data.city,
          ...(data.role === Role.TUTOR
            ? { tutorProfile: { create: { whatsapp: data.phone, city: data.city } } }
            : {}),
        },
      })
    } catch (e) {
      // Corrida (F3): email passou no findByEmail mas violou o unique no insert.
      // O único unique violável neste create é User.email (user + perfil novos);
      // confirmamos via meta.target p/ não mascarar uma futura violação diferente.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = e.meta?.target
        const onEmail = Array.isArray(target)
          ? target.includes('email')
          : typeof target === 'string' && target.includes('email')
        if (onEmail) {
          throw new ConflictException('Email já cadastrado')
        }
      }
      throw e
    }
  }

  /** Atualização parcial dos dados que o próprio usuário pode editar. */
  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; city?: string }
  ): Promise<User> {
    // Sem phone/city não há o que propagar ao TutorProfile — update simples.
    if (data.phone === undefined && data.city === undefined) {
      return this.prisma.user.update({ where: { id: userId }, data })
    }
    // F1/F4: User + TutorProfile numa transação em LOTE (array form) — atômica e
    // segura com pgBouncer (NÃO é $transaction interativo). updateMany é no-op
    // quando não há perfil (evita checar existência) e roda no mesmo round-trip.
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data }),
      this.prisma.tutorProfile.updateMany({
        where: { userId },
        data: {
          ...(data.phone !== undefined ? { whatsapp: data.phone } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
        },
      }),
    ])
    return user
  }
}
