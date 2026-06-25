import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class CreateVetProfileDto {
  @ApiPropertyOptional({ example: 'https://storage/.../foto.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string

  @ApiProperty({ example: '12345' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  crmvNumber!: string

  @ApiProperty({ example: 'SP' })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  crmvUf!: string

  @ApiProperty({ example: ['Clínica geral', 'Silvestres'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  specialties!: string[]

  @ApiPropertyOptional({ example: 'Veterinário com 10 anos de experiência.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  servesAtClinic?: boolean

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  servesAtHome?: boolean

  @ApiPropertyOptional({ example: 'Clínica PetVida' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  clinicName?: string

  @ApiPropertyOptional({ example: 'Rua das Flores, 100, Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clinicAddress?: string

  @ApiPropertyOptional({ example: 'https://storage/.../crmv.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  crmvDocUrl?: string
}
