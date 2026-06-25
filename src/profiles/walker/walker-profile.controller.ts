import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CreateWalkerProfileDto } from './dto/create-walker-profile.dto'
import { UpdateWalkerProfileDto } from './dto/update-walker-profile.dto'
import { WalkerProfileService } from './walker-profile.service'

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles/walker')
export class WalkerProfileController {
  constructor(private readonly service: WalkerProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Cria o perfil de passeador do usuário autenticado' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWalkerProfileDto) {
    return this.service.create(user.userId, dto)
  }

  @Get('me')
  @ApiOperation({ summary: 'Meu perfil de passeador' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.userId)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza meu perfil de passeador' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateWalkerProfileDto) {
    return this.service.update(user.userId, dto)
  }

  @Delete('me')
  @ApiOperation({ summary: 'Remove meu perfil de passeador' })
  remove(@CurrentUser() user: AuthUser) {
    return this.service.remove(user.userId)
  }
}
