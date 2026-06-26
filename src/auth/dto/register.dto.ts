import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'Maria Tutora' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @ApiProperty({ example: 'maria@petagil.app' })
  @IsEmail()
  @MaxLength(254)
  email!: string

  @ApiPropertyOptional({ example: '+55 11 99999-0000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string

  // argon2 não tem o limite de 72 bytes do bcrypt; cap só p/ evitar payload
  // gigante (DoS de hashing) e manter o JWT enxuto (claim `name`/`email`, AC11).
  @ApiProperty({ example: 'Petagil123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string

  @ApiProperty({ enum: ['tutor', 'vet', 'passeador'], example: 'tutor' })
  @IsIn(['tutor', 'vet', 'passeador'])
  role!: 'tutor' | 'vet' | 'passeador'
}
