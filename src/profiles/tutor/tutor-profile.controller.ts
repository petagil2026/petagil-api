import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CreateTutorProfileDto } from './dto/create-tutor-profile.dto'
import { UpdateTutorProfileDto } from './dto/update-tutor-profile.dto'
import { TutorProfileService } from './tutor-profile.service'

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles/tutor')
export class TutorProfileController {
  constructor(private readonly service: TutorProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Cria o perfil de tutor do usuário autenticado' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTutorProfileDto) {
    return this.service.create(user.userId, dto)
  }

  @Get('me')
  @ApiOperation({ summary: 'Meu perfil de tutor' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.userId)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza meu perfil de tutor' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateTutorProfileDto) {
    return this.service.update(user.userId, dto)
  }

  @Delete('me')
  @ApiOperation({ summary: 'Remove meu perfil de tutor' })
  remove(@CurrentUser() user: AuthUser) {
    return this.service.remove(user.userId)
  }
}
