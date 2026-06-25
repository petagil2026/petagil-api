import { Injectable, NotFoundException } from '@nestjs/common'
import { Vaccination } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { CreateVaccinationDto } from './dto/create-vaccination.dto'
import { UpdateVaccinationDto } from './dto/update-vaccination.dto'
import { PetsService } from './pets.service'

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService
  ) {}

  async create(ownerId: string, petId: string, dto: CreateVaccinationDto): Promise<Vaccination> {
    await this.pets.getOwnedOrThrow(ownerId, petId)
    return this.prisma.vaccination.create({
      data: {
        petId,
        name: dto.name,
        date: dto.date ? new Date(dto.date) : undefined,
        nextDoseAt: dto.nextDoseAt ? new Date(dto.nextDoseAt) : undefined,
        notes: dto.notes,
      },
    })
  }

  async findAll(ownerId: string, petId: string): Promise<Vaccination[]> {
    await this.pets.getOwnedOrThrow(ownerId, petId)
    return this.prisma.vaccination.findMany({
      where: { petId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(
    ownerId: string,
    petId: string,
    id: string,
    dto: UpdateVaccinationDto
  ): Promise<Vaccination> {
    await this.getOwnedVaccinationOrThrow(ownerId, petId, id)
    return this.prisma.vaccination.update({
      where: { id },
      data: {
        name: dto.name,
        date: dto.date ? new Date(dto.date) : undefined,
        nextDoseAt: dto.nextDoseAt ? new Date(dto.nextDoseAt) : undefined,
        notes: dto.notes,
      },
    })
  }

  async remove(ownerId: string, petId: string, id: string): Promise<{ ok: true }> {
    await this.getOwnedVaccinationOrThrow(ownerId, petId, id)
    await this.prisma.vaccination.delete({ where: { id } })
    return { ok: true }
  }

  private async getOwnedVaccinationOrThrow(
    ownerId: string,
    petId: string,
    id: string
  ): Promise<Vaccination> {
    await this.pets.getOwnedOrThrow(ownerId, petId)
    const vac = await this.prisma.vaccination.findUnique({ where: { id } })
    if (!vac || vac.petId !== petId) {
      throw new NotFoundException('Vacina não encontrada')
    }
    return vac
  }
}
