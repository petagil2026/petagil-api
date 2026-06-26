import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/** Campos que o próprio usuário pode atualizar em `PATCH /users/me`. */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Dra. Maria Silva' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string

  @ApiPropertyOptional({ example: '+55 11 99999-0000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string
}
