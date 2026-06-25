import { PartialType } from '@nestjs/swagger'

import { CreateWalkerProfileDto } from './create-walker-profile.dto'

export class UpdateWalkerProfileDto extends PartialType(CreateWalkerProfileDto) {}
