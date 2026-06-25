import { SetMetadata } from '@nestjs/common'

import type { ApiRole } from '../../users/users.service'

export const ROLES_KEY = 'roles'

/**
 * `@Roles('vet')` — marca os papéis exigidos por uma rota, lidos pelo `RolesGuard`.
 * Preparado para rotas futuras (não usado nesta entrega de auth).
 */
export const Roles = (...roles: ApiRole[]) => SetMetadata(ROLES_KEY, roles)
