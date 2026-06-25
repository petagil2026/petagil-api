import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateVaccinationDto } from './dto/create-vaccination.dto'
import { UpdateVaccinationDto } from './dto/update-vaccination.dto'
import { VaccinationsService } from './vaccinations.service'

@ApiTags('pets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets/:petId/vaccinations')
export class VaccinationsController {
  constructor(private readonly service: VaccinationsService) {}

  @Post()
  @ApiOperation({ summary: 'Adiciona uma vacina à carteira do pet' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Body() dto: CreateVaccinationDto
  ) {
    return this.service.create(user.userId, petId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Lista a carteira de vacinação do pet' })
  findAll(@CurrentUser() user: AuthUser, @Param('petId') petId: string) {
    return this.service.findAll(user.userId, petId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma vacina da carteira' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVaccinationDto
  ) {
    return this.service.update(user.userId, petId, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma vacina da carteira' })
  remove(@CurrentUser() user: AuthUser, @Param('petId') petId: string, @Param('id') id: string) {
    return this.service.remove(user.userId, petId, id)
  }
}
