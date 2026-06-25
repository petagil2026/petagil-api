import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreatePetDto } from './dto/create-pet.dto'
import { UpdatePetDto } from './dto/update-pet.dto'
import { PetsService } from './pets.service'

@ApiTags('pets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly service: PetsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um pet do usuário autenticado' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePetDto) {
    return this.service.create(user.userId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Lista meus pets' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um pet meu' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.userId, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um pet meu' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePetDto) {
    return this.service.update(user.userId, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um pet meu' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.userId, id)
  }
}
