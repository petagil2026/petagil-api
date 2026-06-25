import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ProfilesService } from './profiles.service'

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Todos os meus perfis (tutor/vet/passeador) + papéis ativos' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findAllForUser(user.userId)
  }
}
