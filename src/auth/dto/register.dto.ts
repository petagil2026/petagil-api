import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator'

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

  // F5: phone é herdado direto como `TutorProfile.whatsapp` no nested write (sem
  // revalidação). MinLength(8)/MaxLength(20) DEVEM casar com
  // CreateTutorProfileDto.whatsapp — divergir reabre bypass de validação.
  @ApiProperty({ example: '+55 11 99999-0000' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string

  // F5: city é herdado direto como `TutorProfile.city` — manter
  // MinLength(1)/MaxLength(120) idêntico a CreateTutorProfileDto.city.
  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string

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
