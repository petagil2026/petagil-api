import { NotFoundException } from '@nestjs/common'
import { Pet, Species } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { PetsService, toApiPet } from './pets.service'

function makePet(o: Partial<Pet> = {}): Pet {
  return {
    id: 'pet-1',
    ownerId: 'user-1',
    name: 'Rex',
    species: Species.DOG,
    breed: null,
    ageYears: null,
    photoUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...o,
  }
}

describe('PetsService', () => {
  let service: PetsService
  let prisma: {
    pet: {
      create: jest.Mock
      findUnique: jest.Mock
      findMany: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
  }

  beforeEach(() => {
    prisma = {
      pet: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }
    service = new PetsService(prisma as unknown as PrismaService)
  })

  it('toApiPet mapeia o enum Species -> minúsculo', () => {
    expect(toApiPet(makePet({ species: Species.CAT })).species).toBe('cat')
    expect(toApiPet(makePet({ species: Species.REPTILE })).species).toBe('reptile')
  })

  it('create mapeia "dog" -> Species.DOG e devolve species minúsculo', async () => {
    prisma.pet.create.mockResolvedValue(makePet({ species: Species.DOG }))
    const res = await service.create('user-1', { name: 'Rex', species: 'dog' })
    expect(prisma.pet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ownerId: 'user-1', species: Species.DOG }),
    })
    expect(res.species).toBe('dog')
    expect(res.ownerId).toBe('user-1')
  })

  it('findOne lança NotFound quando o pet pertence a outro dono', async () => {
    prisma.pet.findUnique.mockResolvedValue(makePet({ ownerId: 'outro-user' }))
    await expect(service.findOne('user-1', 'pet-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('findOne lança NotFound quando o pet não existe', async () => {
    prisma.pet.findUnique.mockResolvedValue(null)
    await expect(service.findOne('user-1', 'inexistente')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('findAll devolve a lista do dono, serializada', async () => {
    prisma.pet.findMany.mockResolvedValue([
      makePet(),
      makePet({ id: 'pet-2', species: Species.BIRD }),
    ])
    const res = await service.findAll('user-1')
    expect(res).toHaveLength(2)
    expect(res[1].species).toBe('bird')
  })
})
