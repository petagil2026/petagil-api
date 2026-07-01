import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CreateVetProfileDto } from './dto/create-vet-profile.dto'
import { UpdateVetProfileDto } from './dto/update-vet-profile.dto'
import { VetProfileService } from './vet-profile.service'

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles/vet')
export class VetProfileController {
  constructor(private readonly service: VetProfileService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria o perfil de clínica (verificação CRMV do responsável técnico fica pendente)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVetProfileDto) {
    return this.service.create(user.userId, dto)
  }

  @Get('me')
  @ApiOperation({ summary: 'Meu perfil de clínica' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.userId)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza meu perfil de clínica' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateVetProfileDto) {
    return this.service.update(user.userId, dto)
  }

  @Delete('me')
  @ApiOperation({ summary: 'Remove meu perfil de clínica' })
  remove(@CurrentUser() user: AuthUser) {
    return this.service.remove(user.userId)
  }
}
