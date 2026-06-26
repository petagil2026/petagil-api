import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { RegisterDto } from './register.dto'

const VALID = {
  name: 'Maria Tutora',
  email: 'maria@petagil.app',
  phone: '+55 11 99999-0000',
  city: 'São Paulo',
  password: 'Petagil123',
  role: 'tutor',
}

async function errorsFor(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(RegisterDto, payload)
  const errors = await validate(dto)
  return errors.map(e => e.property)
}

describe('RegisterDto', () => {
  it('payload válido → zero erros', async () => {
    expect(await errorsFor(VALID)).toHaveLength(0)
  })

  it('AC4: sem phone → erro em phone', async () => {
    const payload: Partial<typeof VALID> = { ...VALID }
    delete payload.phone
    expect(await errorsFor(payload)).toContain('phone')
  })

  it('AC4: sem city → erro em city', async () => {
    const payload: Partial<typeof VALID> = { ...VALID }
    delete payload.city
    expect(await errorsFor(payload)).toContain('city')
  })

  it('AC5: phone com menos de 8 chars → erro em phone', async () => {
    expect(await errorsFor({ ...VALID, phone: '123' })).toContain('phone')
  })

  it('AC5: city vazia → erro em city', async () => {
    expect(await errorsFor({ ...VALID, city: '' })).toContain('city')
  })
})
