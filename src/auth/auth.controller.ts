import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUser } from '../common/decorators/current-user.decorator'
import { AuthService, RefreshBundle, TokenBundle } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { PublicUser } from '../users/users.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cria um usuário (tutor|vet) e devolve tokens' })
  register(@Body() dto: RegisterDto): Promise<TokenBundle> {
    return this.auth.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica por email/senha e devolve tokens + user' })
  login(@Body() dto: LoginDto): Promise<TokenBundle> {
    return this.auth.login(dto)
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Troca um refresh_token por novos tokens' })
  refresh(@Body() dto: RefreshDto): Promise<RefreshBundle> {
    return this.auth.refresh(dto)
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout (stateless; o cliente descarta os tokens)' })
  logout(): { ok: true } {
    return { ok: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado (Bearer)' })
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.auth.me(user.userId)
  }
}
