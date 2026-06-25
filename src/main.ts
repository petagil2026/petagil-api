import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NextFunction, Request, Response } from 'express'

import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  // F1/F2 (trailing slash) — ANTES do prefixo/rotas.
  // NestJS 11 roda em Express 5 (path-to-regexp v8), que NÃO casa `/x/` numa
  // rota `/x`. Sem esta normalização, o app chamaria `/auth/refresh/` e
  // `/auth/me/` (com barra) e tomaria 404. Reescrevemos req.url removendo a
  // barra final antes do roteamento.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url.length > 1) {
      // Remove a(s) barra(s) final(is); nunca deixa a URL vazia (ex.: `//` -> `/`).
      const normalized = req.url.replace(/\/+(\?|$)/, '$1')
      req.url = normalized === '' ? '/' : normalized
    }
    next()
  })

  app.setGlobalPrefix('api')

  // whitelist remove props extras (ex.: id_token do refresh). SEM
  // forbidNonWhitelisted — senão o id_token extra do app viraria 400.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  const config = app.get(ConfigService)
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN') ?? '*' })

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PetÁgil API')
    .setDescription('Autenticação (registro/login/JWT) do PetÁgil')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)
}

void bootstrap()
