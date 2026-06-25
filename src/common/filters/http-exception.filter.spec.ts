import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'

import { HttpExceptionFilter } from './http-exception.filter'

function mockHost(): {
  host: ArgumentsHost
  getJson: () => { success: boolean; detail: string }
  getStatus: () => number
} {
  let statusCode = 0
  let jsonBody: { success: boolean; detail: string } = { success: false, detail: '' }
  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(body: { success: boolean; detail: string }) {
      jsonBody = body
      return this
    },
  }
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ArgumentsHost
  return { host, getJson: () => jsonBody, getStatus: () => statusCode }
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter()

  beforeAll(() => {
    // Silencia o log de stack do teste de erro 500.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('F13/AC10: achata message: string[] do ValidationPipe numa string única', () => {
    const { host, getJson, getStatus } = mockHost()
    filter.catch(new BadRequestException(['email must be an email', 'password too short']), host)

    expect(getStatus()).toBe(HttpStatus.BAD_REQUEST)
    const body = getJson()
    expect(body.success).toBe(false)
    expect(typeof body.detail).toBe('string')
    expect(body.detail).toContain('email must be an email')
    expect(body.detail).toContain('password too short')
    expect(body.detail).not.toContain('[object Object]')
  })

  it('usa a string da HttpException quando message é string', () => {
    const { host, getJson, getStatus } = mockHost()
    filter.catch(new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED), host)

    expect(getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    expect(getJson().detail).toBe('Credenciais inválidas')
  })

  it('erro não-HTTP vira 500 com detail string genérico', () => {
    const { host, getJson, getStatus } = mockHost()
    filter.catch(new Error('boom'), host)

    expect(getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
    const body = getJson()
    expect(body.success).toBe(false)
    expect(typeof body.detail).toBe('string')
  })
})
