import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/** Protege rotas exigindo um access token JWT válido (Bearer). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
