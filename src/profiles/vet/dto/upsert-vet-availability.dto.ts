import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

/** Chaves de período aceitas (espelha o enum Prisma `AvailabilityPeriod`). */
export const AVAILABILITY_PERIODS = ['MORNING', 'AFTERNOON', 'NIGHT'] as const

/** Durações de consulta permitidas (minutos). */
export const SLOT_DURATIONS = [20, 30, 45, 60] as const

/**
 * Período habilitado da disponibilidade. `start`/`end` são "HH:MM" zero-padded
 * (ex.: "08:00"). A regex é estrita (exige 2 dígitos na hora) — convenção 1 da spec.
 */
export class AvailabilityPeriodDto {
  @ApiProperty({ enum: AVAILABILITY_PERIODS, example: 'MORNING' })
  @IsString()
  @IsIn(AVAILABILITY_PERIODS)
  period!: (typeof AVAILABILITY_PERIODS)[number]

  @ApiProperty({ example: '08:00', description: 'Início "HH:MM" zero-padded' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start deve ser "HH:MM" zero-padded' })
  start!: string

  @ApiProperty({ example: '12:00', description: 'Fim "HH:MM" zero-padded' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end deve ser "HH:MM" zero-padded' })
  end!: string
}

/**
 * Substitui a regra de disponibilidade inteira (upsert 1:1 com VetProfile).
 * `weekdays` na ordem da UI (0=Segunda … 6=Domingo).
 */
export class UpsertVetAvailabilityDto {
  @ApiProperty({ example: [0, 1, 2, 3, 4], type: [Number], description: '0=Seg … 6=Dom' })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays!: number[]

  @ApiProperty({ enum: SLOT_DURATIONS, example: 30 })
  @IsIn(SLOT_DURATIONS)
  slotDurationMin!: (typeof SLOT_DURATIONS)[number]

  @ApiProperty({ type: [AvailabilityPeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityPeriodDto)
  periods!: AvailabilityPeriodDto[]
}
