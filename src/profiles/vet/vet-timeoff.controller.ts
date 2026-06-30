import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CreateVetTimeOffDto } from './dto/create-vet-timeoff.dto'
import { VetTimeOffService } from './vet-timeoff.service'

// Subpaths `me/timeoff` no root `profiles/vet` (mesma razão de [F4]).
@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles/vet')
export class VetTimeOffController {
  constructor(private readonly service: VetTimeOffService) {}

  @Get('me/timeoff')
  @ApiOperation({ summary: 'Minhas folgas/bloqueios' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.userId)
  }

  @Post('me/timeoff')
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria uma folga/bloqueio' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVetTimeOffDto) {
    return this.service.create(user.userId, dto)
  }

  @Delete('me/timeoff/:id')
  @ApiOperation({ summary: 'Remove uma folga/bloqueio meu' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.userId, id)
  }
}
