import { Module } from '@nestjs/common'

import { ProfilesController } from './profiles.controller'
import { ProfilesService } from './profiles.service'
import { TutorProfileController } from './tutor/tutor-profile.controller'
import { TutorProfileService } from './tutor/tutor-profile.service'
import { VetProfileController } from './vet/vet-profile.controller'
import { VetProfileService } from './vet/vet-profile.service'
import { WalkerProfileController } from './walker/walker-profile.controller'
import { WalkerProfileService } from './walker/walker-profile.service'

@Module({
  controllers: [
    ProfilesController,
    TutorProfileController,
    VetProfileController,
    WalkerProfileController,
  ],
  providers: [ProfilesService, TutorProfileService, VetProfileService, WalkerProfileService],
})
export class ProfilesModule {}
