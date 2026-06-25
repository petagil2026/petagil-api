import { PartialType } from '@nestjs/swagger'

import { CreateTutorProfileDto } from './create-tutor-profile.dto'

export class UpdateTutorProfileDto extends PartialType(CreateTutorProfileDto) {}
