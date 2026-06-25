import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateVaccinationDto {
  @ApiProperty({ example: 'V10 (múltipla)' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Data da aplicação (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date?: string

  @ApiPropertyOptional({ example: '2027-06-01', description: 'Próxima dose (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  nextDoseAt?: string

  @ApiPropertyOptional({ example: 'Aplicada na clínica X' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
