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
      throw new ConflictException('Perfil de veterinário já existe')
    }
    try {
      // `verification` fica no default PENDING (server-controlled — o usuário
      // não pode se auto-aprovar). CRMV é validado depois (Siscad Web).
      return await this.prisma.vetProfile.create({ data: { userId, ...dto } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('CRMV já cadastrado')
      }
      throw e
    }
  }

  async findMine(userId: string): Promise<VetProfile> {
    const profile = await this.prisma.vetProfile.findUnique({ where: { userId } })
    if (!profile) {
      throw new NotFoundException('Perfil de veterinário não encontrado')
    }
    return profile
  }

  async update(userId: string, dto: UpdateVetProfileDto): Promise<VetProfile> {
    await this.findMine(userId)
    try {
      return await this.prisma.vetProfile.update({ where: { userId }, data: dto })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('CRMV já cadastrado')
      }
      throw e
    }
  }

  async remove(userId: string): Promise<{ ok: true }> {
    await this.findMine(userId)
    await this.prisma.vetProfile.delete({ where: { userId } })
    return { ok: true }
  }
}
