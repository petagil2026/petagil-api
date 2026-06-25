import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface SuccessEnvelope<T> {
  success: true
  data: T
}

/**
 * Embrulha toda resposta de sucesso no envelope { success: true, data }
 * — espelhando o `ApiResponse<T>` que o app já espera.
 * Não re-embrulha payloads que já tenham a chave `success`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T> | T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T> | T> {
    return next.handle().pipe(
      map(data => {
        if (data !== null && typeof data === 'object' && 'success' in (data as object)) {
          return data
        }
        return { success: true as const, data }
      })
    )
  }
}
