import { PrismaClient, Role } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

// Senha conhecida dos usuários de teste (apenas dev).
const SEED_PASSWORD = 'Petagil123'

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(SEED_PASSWORD)

  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@petagil.app' },
    update: {},
    create: {
      name: 'Tutor de Teste',
      email: 'tutor@petagil.app',
      passwordHash,
      role: Role.TUTOR,
    },
  })

  const vet = await prisma.user.upsert({
    where: { email: 'vet@petagil.app' },
    update: {},
    create: {
      name: 'Vet de Teste',
      email: 'vet@petagil.app',
      passwordHash,
      role: Role.VET,
    },
  })

  console.log('Seed concluído. Usuários de teste:')
  console.log(`  - ${tutor.email} (TUTOR) / senha: ${SEED_PASSWORD}`)
  console.log(`  - ${vet.email} (VET)   / senha: ${SEED_PASSWORD}`)
}

void main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e: unknown) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
