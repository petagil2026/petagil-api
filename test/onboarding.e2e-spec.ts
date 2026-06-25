import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import type { NextFunction, Request, Response } from 'express'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { PrismaService } from '../src/prisma/prisma.service'

/**
 * E2E do onboarding (REQUER banco). Cobre: cadastro dos 3 perfis (multi-perfil),
 * Pet + carteira de vacinação, agregado /profiles/me e isolamento por dono.
 */
describe('Onboarding (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const emailA = `e2e_onb_a_${Date.now()}@petagil.app`
  const emailB = `e2e_onb_b_${Date.now()}@petagil.app`
  const password = 'Petagil123'
  let tokenA = ''
  let tokenB = ''
  let petId = ''

  const server = () => app.getHttpServer()
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

  async function registerAndToken(email: string): Promise<string> {
    const res = await request(server())
      .post('/api/auth/register')
      .send({ name: 'E2E', email, password, role: 'tutor' })
    return res.body.data.access_token as string
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
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
    tokenA = await registerAndToken(emailA)
    tokenB = await registerAndToken(emailB)
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } })
    }
    if (app) {
      await app.close()
    }
  })

  // ---- Perfil de Tutor ----
  it('cria perfil de tutor -> 201', async () => {
    const res = await request(server())
      .post('/api/profiles/tutor')
      .set(auth(tokenA))
      .send({ whatsapp: '+55 11 90000-0000', city: 'São Paulo' })
    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.data.city).toBe('São Paulo')
  })

  it('cria perfil de tutor duplicado -> 409', async () => {
    const res = await request(server())
      .post('/api/profiles/tutor')
      .set(auth(tokenA))
      .send({ whatsapp: '+55 11 90000-0000', city: 'São Paulo' })
    expect(res.status).toBe(HttpStatus.CONFLICT)
    expect(res.body.success).toBe(false)
  })

  it('GET /profiles/tutor/me -> 200', async () => {
    const res = await request(server()).get('/api/profiles/tutor/me').set(auth(tokenA))
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.whatsapp).toContain('90000')
  })

  it('PATCH /profiles/tutor/me -> 200 atualiza cidade', async () => {
    const res = await request(server())
      .patch('/api/profiles/tutor/me')
      .set(auth(tokenA))
      .send({ city: 'Campinas' })
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.city).toBe('Campinas')
  })

  // ---- Pet + vacinação ----
  it('cria pet -> 201 com species minúsculo', async () => {
    const res = await request(server())
      .post('/api/pets')
      .set(auth(tokenA))
      .send({ name: 'Rex', species: 'dog', breed: 'SRD', ageYears: 3 })
    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.data.species).toBe('dog')
    expect(res.body.data.name).toBe('Rex')
    petId = res.body.data.id as string
  })

  it('rejeita species inválido -> 400', async () => {
    const res = await request(server())
      .post('/api/pets')
      .set(auth(tokenA))
      .send({ name: 'X', species: 'dinossauro' })
    expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    expect(typeof res.body.detail).toBe('string')
  })

  it('lista meus pets -> 200 (1 pet)', async () => {
    const res = await request(server()).get('/api/pets').set(auth(tokenA))
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data).toHaveLength(1)
  })

  it('adiciona vacina à carteira -> 201', async () => {
    const res = await request(server())
      .post(`/api/pets/${petId}/vaccinations`)
      .set(auth(tokenA))
      .send({ name: 'V10', date: '2026-06-01', nextDoseAt: '2027-06-01' })
    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.data.name).toBe('V10')
  })

  it('lista a carteira -> 200 (1 vacina)', async () => {
    const res = await request(server()).get(`/api/pets/${petId}/vaccinations`).set(auth(tokenA))
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data).toHaveLength(1)
  })

  // ---- Multi-perfil ----
  it('o mesmo usuário cria perfil de vet -> 201 (status PENDING)', async () => {
    const res = await request(server())
      .post('/api/profiles/vet')
      .set(auth(tokenA))
      .send({ crmvNumber: '12345', crmvUf: 'SP', specialties: ['Clínica geral', 'Silvestres'] })
    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.data.verification).toBe('PENDING')
  })

  it('o mesmo usuário cria perfil de passeador -> 201', async () => {
    const res = await request(server())
      .post('/api/profiles/walker')
      .set(auth(tokenA))
      .send({ city: 'São Paulo', petTypes: ['Cães'], region: 'Zona Sul', pricePerWalk: 4500 })
    expect(res.status).toBe(HttpStatus.CREATED)
    expect(res.body.data.pricePerWalk).toBe(4500)
  })

  it('GET /profiles/me agrega os 3 papéis', async () => {
    const res = await request(server()).get('/api/profiles/me').set(auth(tokenA))
    expect(res.status).toBe(HttpStatus.OK)
    expect(res.body.data.roles.sort()).toEqual(['passeador', 'tutor', 'vet'])
    expect(res.body.data.tutor).not.toBeNull()
    expect(res.body.data.vet).not.toBeNull()
    expect(res.body.data.walker).not.toBeNull()
  })

  // ---- Isolamento por dono ----
  it('usuário B NÃO acessa o pet do usuário A -> 404', async () => {
    const res = await request(server()).get(`/api/pets/${petId}`).set(auth(tokenB))
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
  })

  it('usuário B NÃO adiciona vacina no pet de A -> 404', async () => {
    const res = await request(server())
      .post(`/api/pets/${petId}/vaccinations`)
      .set(auth(tokenB))
      .send({ name: 'Hack' })
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
  })

  it('rotas de perfil exigem autenticação -> 401 sem token', async () => {
    const res = await request(server()).get('/api/profiles/me')
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
