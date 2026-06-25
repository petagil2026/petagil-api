import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreateWalkerProfileDto {
  @ApiPropertyOptional({ example: 'https://storage/.../foto.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string

  @ApiPropertyOptional({ example: 'Amo cães, ativo e pontual.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string

  @ApiProperty({ example: ['Cães', 'Gatos', 'Pequenos'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  petTypes!: string[]

  @ApiProperty({ example: 'Zona Sul' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  region!: string

  @ApiProperty({
    example: 4500,
    description: 'Preço por passeio em CENTAVOS de BRL (ex.: 4500 = R$ 45,00)',
  })
  @IsInt()
  @Min(0)
  @Max(10_000_00)
  pricePerWalk!: number
}
