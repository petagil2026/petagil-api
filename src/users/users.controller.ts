import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { UpdateMeDto } from './dto/update-me.dto'
import { toPublicUser, UsersService, type PublicUser } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Meus dados de usuário' })
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    const found = await this.users.findByIdOrThrow(user.userId)
    return toPublicUser(found)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza meus dados (nome, celular, cidade)' })
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto): Promise<PublicUser> {
    const updated = await this.users.updateProfile(user.userId, dto)
    return toPublicUser(updated)
  }
}
