import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

// [F11] Contrato estrito `YYYY-MM-DD` (sem componente de hora) — `@IsDateString`
// aceitaria datetimes completos que o service só recortaria com `.slice(0,10)`.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Query do endpoint de geração de slots: intervalo de datas `YYYY-MM-DD`. */
export class SlotsQueryDto {
  @ApiProperty({ example: '2026-06-29', description: 'Data inicial (YYYY-MM-DD)' })
  @Matches(DATE_ONLY, { message: 'from deve ser YYYY-MM-DD' })
  from!: string

  @ApiProperty({ example: '2026-07-05', description: 'Data final (YYYY-MM-DD), inclusiva' })
  @Matches(DATE_ONLY, { message: 'to deve ser YYYY-MM-DD' })
  to!: string
}
