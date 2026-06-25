import { plainToInstance } from 'class-transformer'
import { IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator'

/**
 * Variáveis de ambiente esperadas pela API.
 *
 * Falha cedo (no bootstrap) se faltar alguma obrigatória ou se um segredo JWT
 * for fraco demais — evita subir a aplicação num estado inseguro/quebrado.
 */
export class EnvironmentVariables {
  // --- Banco (Supabase) ---
  /** Conexão pooled (pgBouncer :6543, com ?pgbouncer=true) — usada pela app. */
  @IsString()
  @MinLength(1)
  DATABASE_URL!: string

  /** Conexão direta (:5432) — usada por `prisma migrate`. */
  @IsString()
  @MinLength(1)
  DIRECT_URL!: string

  // --- JWT ---
  @IsString()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET deve ter ao menos 16 caracteres' })
  JWT_ACCESS_SECRET!: string

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET deve ter ao menos 16 caracteres' })
  JWT_REFRESH_SECRET!: string

  /** TTL do access token, formato aceito pelo @nestjs/jwt (ex.: '900s', '15m'). */
  @IsString()
  JWT_ACCESS_TTL!: string

  /** TTL do refresh token (ex.: '30d'). */
  @IsString()
  JWT_REFRESH_TTL!: string

  // --- Servidor ---
  @IsInt()
  PORT!: number

  /** Origem(ns) permitida(s) no CORS. '*' em dev. */
  @IsString()
  CORS_ORIGIN!: string

  // --- Ambiente ---
  @IsOptional()
  @IsString()
  NODE_ENV?: string
}

/**
 * Defaults aplicados antes da validação. As obrigatórias sem default
 * (DATABASE_URL, DIRECT_URL, segredos JWT) precisam vir do `.env`.
 */
const DEFAULTS: Record<string, string | number> = {
  JWT_ACCESS_TTL: '900s', // 15 min
  JWT_REFRESH_TTL: '30d',
  PORT: 3000,
  CORS_ORIGIN: '*',
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const merged = { ...DEFAULTS, ...config }

  const validated = plainToInstance(EnvironmentVariables, merged, {
    enableImplicitConversion: true, // PORT vem como string do process.env -> number
  })

  const errors = validateSync(validated, { skipMissingProperties: false })

  if (errors.length > 0) {
    const details = errors
      .map(e => Object.values(e.constraints ?? {}).join(', '))
      .filter(Boolean)
      .join('\n  - ')
    throw new Error(`Configuração de ambiente inválida:\n  - ${details}`)
  }

  return validated
}
