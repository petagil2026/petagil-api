import { Module } from '@nestjs/common'

import { ProfilesController } from './profiles.controller'
import { ProfilesService } from './profiles.service'
import { TutorProfileController } from './tutor/tutor-profile.controller'
import { TutorProfileService } from './tutor/tutor-profile.service'
import { VetAvailabilityController } from './vet/vet-availability.controller'
import { VetAvailabilityService } from './vet/vet-availability.service'
import { VetProfileController } from './vet/vet-profile.controller'
import { VetProfileService } from './vet/vet-profile.service'
import { VetTimeOffController } from './vet/vet-timeoff.controller'
import { VetTimeOffService } from './vet/vet-timeoff.service'
import { WalkerProfileController } from './walker/walker-profile.controller'
import { WalkerProfileService } from './walker/walker-profile.service'

@Module({
  controllers: [
    ProfilesController,
    TutorProfileController,
    VetProfileController,
    VetAvailabilityController,
    VetTimeOffController,
    WalkerProfileController,
  ],
  providers: [
    ProfilesService,
    TutorProfileService,
    VetProfileService,
    VetAvailabilityService,
    VetTimeOffService,
    WalkerProfileService,
  ],
})
export class ProfilesModule {}
