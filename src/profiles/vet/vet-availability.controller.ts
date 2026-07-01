import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { SlotsQueryDto } from './dto/slots-query.dto'
import { UpsertVetAvailabilityDto } from './dto/upsert-vet-availability.dto'
import { VetAvailabilityService } from './vet-availability.service'

// Subpaths `me/availability` no root `profiles/vet` (não rotear em `profiles/vet/me`,
// que pertence ao VetProfileController) — [F4] da spec.
@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles/vet')
export class VetAvailabilityController {
  constructor(private readonly service: VetAvailabilityService) {}

  @Get('me/availability')
  @ApiOperation({ summary: 'Minha disponibilidade recorrente' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.userId)
  }

  @Put('me/availability')
  @ApiOperation({ summary: 'Substitui minha disponibilidade recorrente' })
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertVetAvailabilityDto) {
    return this.service.upsert(user.userId, dto)
  }

  @Get('me/availability/slots')
  @ApiOperation({ summary: 'Slots livres gerados sob demanda para um intervalo' })
  getSlots(@CurrentUser() user: AuthUser, @Query() query: SlotsQueryDto) {
    return this.service.getSlots(user.userId, query)
  }
}
