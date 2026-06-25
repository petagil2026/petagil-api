import { Injectable } from '@nestjs/common'
import { TutorProfile, VetProfile, WalkerProfile } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { ApiRole } from '../users/users.service'

export interface MyProfiles {
  tutor: TutorProfile | null
  vet: VetProfile | null
  walker: WalkerProfile | null
  /** Papéis para os quais o usuário já tem perfil criado. */
  roles: ApiRole[]
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<MyProfiles> {
    const [tutor, vet, walker] = await Promise.all([
      this.prisma.tutorProfile.findUnique({ where: { userId } }),
      this.prisma.vetProfile.findUnique({ where: { userId } }),
      this.prisma.walkerProfile.findUnique({ where: { userId } }),
    ])

    const roles: ApiRole[] = []
    if (tutor) roles.push('tutor')
    if (vet) roles.push('vet')
    if (walker) roles.push('passeador')

    return { tutor, vet, walker, roles }
  }
}
