import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import type { ApiRole } from '../../users/users.service'

interface AccessTokenPayload {
  sub: string
  email: string
  role: ApiRole
  name: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
  }

  /** O retorno vira `req.user` (AuthUser). */
  validate(payload: AccessTokenPayload): AuthUser {
    return { userId: payload.sub, email: payload.email, role: payload.role }
  }
}
