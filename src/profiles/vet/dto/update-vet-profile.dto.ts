import { PartialType } from '@nestjs/swagger'

import { CreateVetProfileDto } from './create-vet-profile.dto'

export class UpdateVetProfileDto extends PartialType(CreateVetProfileDto) {}
