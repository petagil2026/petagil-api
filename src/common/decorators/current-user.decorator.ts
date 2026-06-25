import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import type { ApiRole } from '../../users/users.service'

/** Usuário autenticado, populado por `JwtStrategy.validate` em `req.user`. */
export interface AuthUser {
  userId: string
  email: string
  role: ApiRole
}

/**
 * `@CurrentUser()` — injeta o `req.user` (AuthUser) num parâmetro do handler.
 * Use atrás do `JwtAuthGuard`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
    return request.user
  }
)
