import { NotFoundException } from '@nestjs/common'

import type { PrismaService } from '../../prisma/prisma.service'

/**
 * Resolve o `id` do VetProfile a partir do `userId` do usuário autenticado.
 * Única fonte da resolução — consumida pelos services de disponibilidade E folgas
 * (sem método privado duplicado). Lança 404 se o user não tem perfil de vet.
 */
export async function resolveVetProfileId(prisma: PrismaService, userId: string): Promise<string> {
  const profile = await prisma.vetProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!profile) {
    throw new NotFoundException('Perfil de clínica não encontrado')
  }
  return profile.id
}
