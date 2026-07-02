import { Injectable, NotFoundException } from '@nestjs/common'
import { Pet, PetSex, Species } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { ApiSex, ApiSpecies, CreatePetDto } from './dto/create-pet.dto'
import { UpdatePetDto } from './dto/update-pet.dto'

const SPECIES_TO_ENUM: Record<ApiSpecies, Species> = {
  dog: Species.DOG,
  cat: Species.CAT,
  bird: Species.BIRD,
  reptile: Species.REPTILE,
}

const SPECIES_TO_API: Record<Species, ApiSpecies> = {
  DOG: 'dog',
  CAT: 'cat',
  BIRD: 'bird',
  REPTILE: 'reptile',
}

const SEX_TO_ENUM: Record<ApiSex, PetSex> = {
  male: PetSex.MALE,
  female: PetSex.FEMALE,
}

const SEX_TO_API: Record<PetSex, ApiSex> = {
  MALE: 'male',
  FEMALE: 'female',
}

/** Forma do Pet exposta na API — `species`/`sex` em minúsculo. */
export interface PublicPet {
  id: string
  ownerId: string
  name: string
  species: ApiSpecies
  breed: string | null
  ageYears: number | null
  photoUrl: string | null
  weightKg: number | null
  sex: ApiSex | null
  neutered: boolean | null
  createdAt: Date
  updatedAt: Date
}

export function toApiPet(pet: Pet): PublicPet {
  return {
    id: pet.id,
    ownerId: pet.ownerId,
    name: pet.name,
    species: SPECIES_TO_API[pet.species],
    breed: pet.breed,
    ageYears: pet.ageYears,
    photoUrl: pet.photoUrl,
    weightKg: pet.weightKg,
    sex: pet.sex ? SEX_TO_API[pet.sex] : null,
    neutered: pet.neutered,
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt,
  }
}

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreatePetDto): Promise<PublicPet> {
    const pet = await this.prisma.pet.create({
      data: {
        ownerId,
        name: dto.name,
        species: SPECIES_TO_ENUM[dto.species],
        breed: dto.breed,
        ageYears: dto.ageYears,
        photoUrl: dto.photoUrl,
        weightKg: dto.weightKg,
        sex: dto.sex ? SEX_TO_ENUM[dto.sex] : undefined,
        neutered: dto.neutered,
      },
    })
    return toApiPet(pet)
  }

  async findAll(ownerId: string): Promise<PublicPet[]> {
    const pets = await this.prisma.pet.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    })
    return pets.map(toApiPet)
  }

  async findOne(ownerId: string, id: string): Promise<PublicPet> {
    return toApiPet(await this.getOwnedOrThrow(ownerId, id))
  }

  async update(ownerId: string, id: string, dto: UpdatePetDto): Promise<PublicPet> {
    await this.getOwnedOrThrow(ownerId, id)
    const pet = await this.prisma.pet.update({
      where: { id },
      data: {
        name: dto.name,
        species: dto.species ? SPECIES_TO_ENUM[dto.species] : undefined,
        breed: dto.breed,
        ageYears: dto.ageYears,
        photoUrl: dto.photoUrl,
        weightKg: dto.weightKg,
        sex: dto.sex ? SEX_TO_ENUM[dto.sex] : undefined,
        neutered: dto.neutered,
      },
    })
    return toApiPet(pet)
  }

  async remove(ownerId: string, id: string): Promise<{ ok: true }> {
    await this.getOwnedOrThrow(ownerId, id)
    await this.prisma.pet.delete({ where: { id } })
    return { ok: true }
  }

  /** Garante que o pet existe E pertence ao usuário (404 caso contrário). */
  async getOwnedOrThrow(ownerId: string, id: string): Promise<Pet> {
    const pet = await this.prisma.pet.findUnique({ where: { id } })
    if (!pet || pet.ownerId !== ownerId) {
      throw new NotFoundException('Pet não encontrado')
    }
    return pet
  }
}
