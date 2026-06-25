import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { validate } from './config/env.validation'
import { HealthModule } from './health/health.module'
import { PetsModule } from './pets/pets.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProfilesModule } from './profiles/profiles.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    ProfilesModule,
    PetsModule,
  ],
})
export class AppModule {}
