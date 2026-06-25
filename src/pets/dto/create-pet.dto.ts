import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

/** Espécies expostas na API (minúsculo), mapeadas para o enum `Species` do Prisma. */
export const PET_SPECIES = ['dog', 'cat', 'bird', 'reptile'] as const
export type ApiSpecies = (typeof PET_SPECIES)[number]

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
}
