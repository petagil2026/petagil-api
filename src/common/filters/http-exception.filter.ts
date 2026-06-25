import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'

export interface ErrorEnvelope {
  success: false
  detail: string
}

/**
 * Mapeia qualquer erro para o shape { success: false, detail } que o
 * `httpClient` do app sabe parsear (lê `parsed.detail` — uma STRING).
 *
 * F13 (crítico): o ValidationPipe lança BadRequestException cujo getResponse()
 * é { statusCode, error, message: string[] } — `message` é um ARRAY. O filtro
 * achata array -> string e nunca serializa objeto cru (que viraria
 * "[object Object]").
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let detail = 'Erro interno'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      detail = this.extractDetail(exception.getResponse())
    } else if (exception instanceof Error) {
      // Erro não-HTTP (bug, falha de infra): loga stack, devolve 500 genérico.
      this.logger.error(exception.message, exception.stack)
    }

    const body: ErrorEnvelope = { success: false, detail }
    response.status(status).json(body)
  }

  /** Extrai uma string de detalhe a partir do getResponse() do HttpException. */
  private extractDetail(res: string | object): string {
    if (typeof res === 'string') {
      return res
    }

    const message = (res as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
    if (Array.isArray(message)) {
      const flattened = message.filter((m): m is string => typeof m === 'string').join('; ')
      if (flattened.length > 0) {
        return flattened
      }
    }

    const error = (res as { error?: unknown }).error
    if (typeof error === 'string') {
      return error
    }

    return 'Erro'
  }
}
