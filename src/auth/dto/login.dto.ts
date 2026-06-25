import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'maria@petagil.app' })
  @IsEmail()
  @MaxLength(254)
  email!: string

  @ApiProperty({ example: 'Petagil123' })
  @IsString()
  @MinLength(1)
  password!: string
}
