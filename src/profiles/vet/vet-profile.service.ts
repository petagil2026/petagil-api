import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, VetProfile } from '@prisma/client'

import { PrismaService } from '../../prisma/prisma.service'
import { CreateVetProfileDto } from './dto/create-vet-profile.dto'
import { UpdateVetProfileDto } from './dto/update-vet-profile.dto'

@Injectable()
export class VetProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateVetProfileDto): Promise<VetProfile> {
    const existing = await this.prisma.vetProfile.findUnique({ where: { userId } })
    if (existing) {
      throw new ConflictException('Perfil de clínica já existe')
    }
    try {
      // `verification` fica no default PENDING (server-controlled — o usuário
      // não pode se auto-aprovar). CRMV é validado depois (Siscad Web).
      return await this.prisma.vetProfile.create({ data: { userId, ...dto } })
    } catch (e) {
      this.rethrowUniqueViolation(e)
    }
  }

  async findMine(userId: string): Promise<VetProfile> {
    const profile = await this.prisma.vetProfile.findUnique({ where: { userId } })
    if (!profile) {
      throw new NotFoundException('Perfil de clínica não encontrado')
    }
    return profile
  }

  async update(userId: string, dto: UpdateVetProfileDto): Promise<VetProfile> {
    await this.findMine(userId)
    try {
      return await this.prisma.vetProfile.update({ where: { userId }, data: dto })
    } catch (e) {
      this.rethrowUniqueViolation(e)
    }
  }

  /**
   * Em violação de unicidade (P2002), lança a mensagem certa: CNPJ da clínica ou
   * CRMV do responsável técnico. Demais erros são re-lançados inalterados.
   * Retorno `never`: o caller não precisa de `return` após chamá-lo.
   */
  private rethrowUniqueViolation(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = Array.isArray(e.meta?.target) ? (e.meta?.target as string[]) : []
      throw new ConflictException(
        target.includes('cnpj') ? 'CNPJ já cadastrado' : 'CRMV já cadastrado'
      )
    }
    throw e
  }

  async remove(userId: string): Promise<{ ok: true }> {
    await this.findMine(userId)
    await this.prisma.vetProfile.delete({ where: { userId } })
    return { ok: true }
  }
}
