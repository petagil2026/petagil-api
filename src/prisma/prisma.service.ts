import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'

/**
 * Cliente Prisma injetável, resiliente a quedas TRANSITÓRIAS de conexão.
 *
 * Por que: rodando contra o pooler do Supabase (Supavisor :6543, atrás de um ELB),
 * conexões ociosas são recicladas entre requests. Quando o Prisma reusa uma conexão
 * já morta, a query falha com erro de conexão (P1001/P1002/P1017) e a request vira
 * 500 — sem que o banco tenha realmente caído. Aqui re-tentamos essas falhas.
 *
 * Segurança de retry: só re-tentamos quando é seguro quanto a efeitos colaterais —
 *   • P1001/P1002 ("can't reach"/timeout ao CONECTAR): a query nem rodou → retry de
 *     qualquer operação é seguro (leitura ou escrita).
 *   • P1017 ("server closed the connection"): pode ter caído NO MEIO da operação →
 *     só re-tentamos LEITURAS (retry de escrita poderia duplicar um insert commitado).
 */

/** Retries por query (janela ~ 200+400+800+1600 ≈ 3s) — cobre blips curtos de rede. */
const MAX_RETRIES = 4
/** Tentativas de conexão no boot antes de seguir em modo lazy. */
const MAX_CONNECT_RETRIES = 4
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** Operações sem efeito colateral — seguras para retry mesmo em P1017. */
const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

const logger = new Logger('PrismaService')

function isRetryable(error: unknown, operation: string): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P1001' || error.code === 'P1002') return true
    if (error.code === 'P1017') return READ_OPERATIONS.has(operation)
  }
  return false
}

/**
 * Conecta no boot com retry. Se TODAS as tentativas falharem, NÃO relança: loga e
 * segue. Um blip do banco/pooler no boot não deve derrubar a aplicação — o Prisma
 * conecta lazy na primeira query (que já é coberta pelo retry de `$allOperations`).
 */
async function connectWithRetry(client: PrismaClient): Promise<void> {
  for (let attempt = 0; attempt <= MAX_CONNECT_RETRIES; attempt++) {
    try {
      await client.$connect()
      if (attempt > 0) logger.log(`Conectado ao banco na tentativa ${attempt + 1}.`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt === MAX_CONNECT_RETRIES) {
        logger.warn(
          `Sem conexão com o banco no boot após ${MAX_CONNECT_RETRIES + 1} tentativas (${message}). ` +
            `Seguindo — a conexão será estabelecida (com retry) na primeira query.`
        )
        return
      }
      const delay = 500 * 2 ** attempt
      logger.warn(`Falha ao conectar no boot (tentativa ${attempt + 1}); novo retry em ${delay}ms`)
      await sleep(delay)
    }
  }
}

/** Extensão que re-tenta operações em falhas transitórias de conexão. */
const retryExtension = Prisma.defineExtension(client =>
  client.$extends({
    name: 'retry-on-transient-connection-errors',
    query: {
      async $allOperations({ operation, model, args, query }) {
        let lastError: unknown
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args)
          } catch (error) {
            lastError = error
            if (!isRetryable(error, operation) || attempt === MAX_RETRIES) throw error
            const delay = 200 * 2 ** attempt
            logger.warn(
              `Conexão transitória em ${model ?? 'raw'}.${operation} ` +
                `(tentativa ${attempt + 1}/${MAX_RETRIES}); novo retry em ${delay}ms`
            )
            await sleep(delay)
            // Força reabrir a conexão antes de re-tentar — descarta conexão morta no
            // pool quando o pooler/rede a reciclou (idempotente; ignora falha aqui).
            await client.$connect().catch(() => undefined)
          }
        }
        throw lastError
      },
    },
  })
)

/**
 * Estende `PrismaClient` para o ciclo de vida (connect/disconnect) e devolve, do
 * construtor, o client JÁ com a extensão de retry. Os `$connect`/`$disconnect` do
 * client base compartilham o mesmo engine do client estendido, então os hooks de
 * lifecycle continuam válidos.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super()
    const base = this
    const extended = this.$extends(retryExtension)
    // O client estendido é imutável; anexamos os hooks de lifecycle do Nest a ele,
    // delegando ao engine compartilhado do client base.
    return Object.assign(extended, {
      onModuleInit: () => connectWithRetry(base),
      onModuleDestroy: () => base.$disconnect(),
    }) as unknown as PrismaService
  }

  async onModuleInit(): Promise<void> {
    await connectWithRetry(this)
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
