import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import type { NextFunction, Request, Response } from 'express'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { PrismaService } from '../src/prisma/prisma.service'

/**
 * E2E do fluxo de auth — REQUER banco (Supabase/Postgres de teste) via
 * DATABASE_URL/DIRECT_URL no .env. Rode com `npm run test:e2e`.
 * Cobre: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const email = `e2e_${Date.now()}@petagil.app`
  const vetEmail = `e2e_vet_${Date.now()}@petagil.app`
  const password = 'Petagil123'
  let refreshToken = ''
  let accessToken = ''

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()

    // Espelha o main.ts: normalização de barra + prefixo + pipe + envelope + filtro.
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.url.length > 1) {
        const normalized = req.url.replace(/\/+(\?|$)/, '$1')
        req.url = normalized === '' ? '/' : normalized
      }
      next()
    })
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new HttpExceptionFilter())

    await app.init()
    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: { in: [email, vetEmail] } } })
    }
    if (app) {
      await app.close()
    }
  })

  const server = () => app.getHttpServer()

  it('AC1: GET /api/health -> 200 { success, data:{ status:"ok" } }', async () => {
    const res = await request(server()).get('/api/health')
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
  })

  it('F3: GET /api/health// (barras extras) normaliza -> 200 (não vira URL vazia)', async () => {
    const res = await request(server()).get('/api/health//')
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.status).toBe('ok')
  })

  it('AC2/AC11: register -> 201, 3 tokens (<2KB) + user (role minúsculo, sem passwordHash)', async () => {
    const res = await request(server())
      .post('/api/auth/register')
      .send({ name: 'E2E', email, password, role: 'tutor' })

    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.success).toBe(true)
    const { access_token, id_token, refresh_token, expires_in, user } = res.body.data
    expect(access_token).toBeDefined()
    expect(id_token).toBeDefined()
    expect(refresh_token).toBeDefined()
    // F6: expires_in é o número de segundos do access TTL (default 900s -> 900).
    expect(expires_in).toBe(900)
    // AC11/F5: cada token < 2KB (limite do iOS Keychain via secureStorage).
    for (const t of [access_token, id_token, refresh_token]) {
      expect(Buffer.byteLength(t as string, 'utf8')).toBeLessThan(2048)
    }
    expect(user.role).toBe('tutor')
    expect(user.sub).toBe(user.id)
    expect(user.passwordHash).toBeUndefined()

    refreshToken = refresh_token
    accessToken = access_token
  })

  it('AC2/F11: register de um VET mapeia role -> "vet"', async () => {
    const res = await request(server())
      .post('/api/auth/register')
      .send({ name: 'Vet E2E', email: vetEmail, password, role: 'vet' })

    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.data.user.role).toBe('vet')
  })

  it('AC3: register com email duplicado -> 409 { success:false, detail }', async () => {
    const res = await request(server())
      .post('/api/auth/register')
      .send({ name: 'E2E', email, password, role: 'tutor' })

    expect(res.status).toBe(HttpStatus.CONFLICT)
    expect(res.body.success).toBe(false)
    expect(typeof res.body.detail).toBe('string')
  })

  it('AC4/AC10: register inválido -> 400 com detail string (array achatado)', async () => {
    const res = await request(server())
      .post('/api/auth/register')
      .send({ name: '', email: 'nao-email', password: '123', role: 'x' })

    expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    expect(res.body.success).toBe(false)
    expect(typeof res.body.detail).toBe('string')
    expect(res.body.detail).not.toContain('[object Object]')
  })

  it('AC5: POST /api/auth/login -> 200 com tokens', async () => {
    const res = await request(server()).post('/api/auth/login').send({ email, password })

    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.access_token).toBeDefined()
    expect(res.body.data.refresh_token).toBeDefined()
    accessToken = res.body.data.access_token
  })

  it('AC6: login com senha errada -> 401 genérico', async () => {
    const res = await request(server())
      .post('/api/auth/login')
      .send({ email, password: 'senha-errada-123' })

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(res.body.success).toBe(false)
    expect(typeof res.body.detail).toBe('string')
  })

  it('AC7: GET /api/auth/me (Bearer) -> 200 { sub, email, name }', async () => {
    const res = await request(server())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.sub).toBeDefined()
    expect(res.body.data.email).toBe(email)
    expect(res.body.data.name).toBeDefined()
    expect(res.body.data.passwordHash).toBeUndefined()
  })

  it('AC9: GET /api/auth/me/ (com barra final) -> 200 (Express 5 trailing slash)', async () => {
    const res = await request(server())
      .get('/api/auth/me/')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.email).toBe(email)
  })

  it('AC7: GET /api/auth/me sem token -> 401', async () => {
    const res = await request(server()).get('/api/auth/me')

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(res.body.success).toBe(false)
  })

  it('AC8/AC9: POST /api/auth/refresh/ (com barra + id_token extra) -> 200', async () => {
    const res = await request(server())
      .post('/api/auth/refresh/')
      .send({ refresh_token: refreshToken, id_token: 'token-extra-ignorado' })

    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.access_token).toBeDefined()
    expect(res.body.data.id_token).toBeDefined()
    expect(res.body.data.expires_in).toBe(900)
  })

  it('AC8: refresh inválido -> 401', async () => {
    const res = await request(server())
      .post('/api/auth/refresh')
      .send({ refresh_token: 'token-invalido' })

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(res.body.success).toBe(false)
  })
})
