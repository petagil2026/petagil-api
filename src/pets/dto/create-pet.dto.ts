import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

/** Espécies expostas na API (minúsculo), mapeadas para o enum `Species` do Prisma. */
export const PET_SPECIES = ['dog', 'cat', 'bird', 'reptile'] as const
export type ApiSpecies = (typeof PET_SPECIES)[number]

/** Sexo exposto na API (minúsculo), mapeado para o enum `PetSex` do Prisma. */
export const PET_SEX = ['male', 'female'] as const
export type ApiSex = (typeof PET_SEX)[number]

export class CreatePetDto {
  @ApiProperty({ example: 'Rex' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @ApiProperty({ enum: PET_SPECIES, example: 'dog' })
  @IsIn(PET_SPECIES)
  species!: ApiSpecies

  @ApiPropertyOptional({ example: 'Golden Retriever' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  breed?: string

  @ApiPropertyOptional({ example: 3, description: 'Idade em anos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  ageYears?: number

  @ApiPropertyOptional({ example: 'https://storage/.../rex.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string

  // Peso em kg (até 2 casas). `@IsPositive` rejeita 0/negativo; `@Max(500)`
  // acomoda espécies grandes/exóticas do nicho silvestre.
  @ApiPropertyOptional({ example: 4.2, description: 'Peso em kg' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(500)
  weightKg?: number

  @ApiPropertyOptional({ enum: PET_SEX, example: 'female' })
  @IsOptional()
  @IsIn(PET_SEX)
  sex?: ApiSex

  @ApiPropertyOptional({ example: true, description: 'Castrado' })
  @IsOptional()
  @IsBoolean()
  neutered?: boolean
}
