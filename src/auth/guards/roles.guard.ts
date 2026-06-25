import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { ROLES_KEY } from '../../common/decorators/roles.decorator'
import type { ApiRole } from '../../users/users.service'

/**
 * Compara os papéis exigidos por `@Roles(...)` com o `req.user.role`.
 * Preparado para rotas futuras (RBAC) — não usado nesta entrega.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ApiRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>()
    const user = request.user

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Acesso negado')
    }

    return true
  }
}
