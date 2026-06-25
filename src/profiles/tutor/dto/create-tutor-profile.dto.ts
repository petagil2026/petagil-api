import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateTutorProfileDto {
  @ApiProperty({ example: '+55 11 99999-0000' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  whatsapp!: string

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string
}
