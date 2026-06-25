import { Module } from '@nestjs/common'

import { PetsController } from './pets.controller'
import { PetsService } from './pets.service'
import { VaccinationsController } from './vaccinations.controller'
import { VaccinationsService } from './vaccinations.service'

@Module({
  controllers: [PetsController, VaccinationsController],
  providers: [PetsService, VaccinationsService],
})
export class PetsModule {}
