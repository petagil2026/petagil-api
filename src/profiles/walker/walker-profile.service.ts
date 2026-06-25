import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { WalkerProfile } from '@prisma/client'

import { PrismaService } from '../../prisma/prisma.service'
import { CreateWalkerProfileDto } from './dto/create-walker-profile.dto'
import { UpdateWalkerProfileDto } from './dto/update-walker-profile.dto'

@Injectable()
export class WalkerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWalkerProfileDto): Promise<WalkerProfile> {
    const existing = await this.prisma.walkerProfile.findUnique({ where: { userId } })
    if (existing) {
      throw new ConflictException('Perfil de passeador já existe')
    }
    return this.prisma.walkerProfile.create({ data: { userId, ...dto } })
  }

  async findMine(userId: string): Promise<WalkerProfile> {
    const profile = await this.prisma.walkerProfile.findUnique({ where: { userId } })
    if (!profile) {
      throw new NotFoundException('Perfil de passeador não encontrado')
    }
    return profile
  }

  async update(userId: string, dto: UpdateWalkerProfileDto): Promise<WalkerProfile> {
    await this.findMine(userId)
    return this.prisma.walkerProfile.update({ where: { userId }, data: dto })
  }

  async remove(userId: string): Promise<{ ok: true }> {
    await this.findMine(userId)
    await this.prisma.walkerProfile.delete({ where: { userId } })
    return { ok: true }
  }
}
