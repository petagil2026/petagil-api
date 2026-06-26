import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { User } from '@prisma/client'
import * as argon2 from 'argon2'

import { parseTtlToSeconds } from '../common/utils/ttl.util'
import {
  ApiRole,
  PublicUser,
  toApiRole,
  toPublicUser,
  toRoleEnum,
  UsersService,
} from '../users/users.service'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { RegisterDto } from './dto/register.dto'

interface AccessClaims {
  sub: string
  email: string
  role: ApiRole
  name: string
}

interface RefreshClaims {
  sub: string
  type: 'refresh'
}

/** Resposta de register/login: 3 tokens + expires_in (segundos) + user público. */
export interface TokenBundle {
  access_token: string
  id_token: string
  refresh_token: string
  expires_in: number
  user: PublicUser
}

/** Resposta de refresh: compatível com `RefreshResponse` do app. */
export interface RefreshBundle {
  access_token: string
  id_token: string
  expires_in: number
}

// F14: hash "dummy" cacheado para equalizar o tempo de resposta quando o email
// não existe — evita oracle de timing (enumeração de usuários). Computado 1x.
let dummyHashPromise: Promise<string> | undefined
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('petagil-dummy-password-for-timing')
  return dummyHashPromise
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<TokenBundle> {
    const existing = await this.users.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException('Email já cadastrado')
    }

    const passwordHash = await argon2.hash(dto.password)
    // createWithProfile cria User + (se tutor) TutorProfile atomicamente; o
    // findByEmail acima é só atalho p/ 409 no caso comum — a corrida é coberta
    // pelo P2002 dentro do createWithProfile (F3). AuthService não toca Prisma.
    const user = await this.users.createWithProfile({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: toRoleEnum(dto.role),
      phone: dto.phone,
      city: dto.city,
    })

    return this.issueTokens(user)
  }

  async login(dto: LoginDto): Promise<TokenBundle> {
    const user = await this.validateUser(dto.email, dto.password)
    return this.issueTokens(user)
  }

  /**
   * Valida credenciais. Em qualquer falha (email inexistente OU senha errada)
   * lança a MESMA mensagem genérica — não revela se o email existe.
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email)
    if (!user) {
      // Gasta ~o mesmo tempo de um verify real para não vazar (por timing) se
      // o email existe — AC6 exige resposta indistinguível.
      try {
        await argon2.verify(await getDummyHash(), password)
      } catch {
        /* ignora — objetivo é só equalizar o tempo */
      }
      throw new UnauthorizedException('Credenciais inválidas')
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas')
    }

    return user
  }

  async refresh(dto: RefreshDto): Promise<RefreshBundle> {
    let payload: { sub?: string; type?: string }
    try {
      payload = await this.jwt.verifyAsync<{ sub?: string; type?: string }>(dto.refresh_token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado')
    }

    // F1: garante que é mesmo um refresh token (claim `type`) e tem subject —
    // defesa em profundidade contra um token de outra classe ser aceito aqui.
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token inválido ou expirado')
    }

    const user = await this.users.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado')
    }

    const bundle = await this.issueTokens(user)
    return {
      access_token: bundle.access_token,
      id_token: bundle.id_token,
      expires_in: bundle.expires_in,
    }
  }

  /** Dados do usuário autenticado — ao menos { sub, email, name } (F3). */
  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado')
    }
    return toPublicUser(user)
  }

  private async issueTokens(user: User): Promise<TokenBundle> {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
    // expiresIn em SEGUNDOS (number) — aceito pelo jsonwebtoken e reusado no
    // campo `expires_in` da resposta (F4: number de segundos, não a string '900s').
    const accessExpiresIn = parseTtlToSeconds(this.config.getOrThrow<string>('JWT_ACCESS_TTL'))
    const refreshExpiresIn = parseTtlToSeconds(this.config.getOrThrow<string>('JWT_REFRESH_TTL'))

    // Claims mínimas (mantém o JWT enxuto, < 2KB do iOS Keychain).
    const accessClaims: AccessClaims = {
      sub: user.id,
      email: user.email,
      role: toApiRole(user.role),
      name: user.name,
    }
    const refreshClaims: RefreshClaims = { sub: user.id, type: 'refresh' }

    const [access_token, id_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(accessClaims, { secret: accessSecret, expiresIn: accessExpiresIn }),
      // id_token: mesmas claims do access (o app exige os 3 tokens no storage).
      this.jwt.signAsync(accessClaims, { secret: accessSecret, expiresIn: accessExpiresIn }),
      this.jwt.signAsync(refreshClaims, { secret: refreshSecret, expiresIn: refreshExpiresIn }),
    ])

    return {
      access_token,
      id_token,
      refresh_token,
      expires_in: accessExpiresIn,
      user: toPublicUser(user),
    }
  }
}
