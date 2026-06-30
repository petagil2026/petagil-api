import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator'

/** Cria uma folga/bloqueio. `startsAt`/`endsAt` são instantes ISO 8601 (UTC). */
export class CreateVetTimeOffDto {
  @ApiProperty({ example: '2026-07-01T03:00:00.000Z', description: 'Início (ISO 8601)' })
  @IsDateString()
  startsAt!: string

  @ApiProperty({ example: '2026-07-02T03:00:00.000Z', description: 'Fim (ISO 8601)' })
  @IsDateString()
  endsAt!: string

  @ApiPropertyOptional({ example: true, description: 'Folga de dia inteiro' })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean

  @ApiPropertyOptional({ example: 'Férias' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string
}
