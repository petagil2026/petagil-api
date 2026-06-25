import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { TutorProfile } from '@prisma/client'

import { PrismaService } from '../../prisma/prisma.service'
import { CreateTutorProfileDto } from './dto/create-tutor-profile.dto'
import { UpdateTutorProfileDto } from './dto/update-tutor-profile.dto'

@Injectable()
export class TutorProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTutorProfileDto): Promise<TutorProfile> {
    const existing = await this.prisma.tutorProfile.findUnique({ where: { userId } })
    if (existing) {
      throw new ConflictException('Perfil de tutor já existe')
    }
    return this.prisma.tutorProfile.create({ data: { userId, ...dto } })
  }

  async findMine(userId: string): Promise<TutorProfile> {
    const profile = await this.prisma.tutorProfile.findUnique({ where: { userId } })
    if (!profile) {
      throw new NotFoundException('Perfil de tutor não encontrado')
    }
    return profile
  }

  async update(userId: string, dto: UpdateTutorProfileDto): Promise<TutorProfile> {
    await this.findMine(userId)
    return this.prisma.tutorProfile.update({ where: { userId }, data: dto })
  }

  async remove(userId: string): Promise<{ ok: true }> {
    await this.findMine(userId)
    await this.prisma.tutorProfile.delete({ where: { userId } })
    return { ok: true }
  }
}
