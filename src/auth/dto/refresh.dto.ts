import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refresh_token!: string

  /**
   * O app envia `{ refresh_token, id_token }`. Aceitamos `id_token` como
   * opcional para o ValidationPipe (whitelist) não barrar a requisição.
   * O valor é ignorado pelo servidor (refresh é validado só pelo refresh_token).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id_token?: string
}
