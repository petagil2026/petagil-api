import { parseTtlToSeconds } from './ttl.util'

describe('parseTtlToSeconds (F4: expires_in em segundos)', () => {
  it.each([
    ['900s', 900],
    ['15m', 900],
    ['1h', 3600],
    ['30d', 2592000],
    ['900', 900],
  ])('converte %s -> %i segundos', (input, expected) => {
    expect(parseTtlToSeconds(input)).toBe(expected)
  })

  it('lança em valor inválido', () => {
    expect(() => parseTtlToSeconds('abc')).toThrow()
  })
})
