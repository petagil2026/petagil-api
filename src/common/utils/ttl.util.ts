/**
 * Converte um TTL no formato aceito pelo @nestjs/jwt ('900s', '15m', '24h', '30d')
 * para SEGUNDOS (number) — usado no campo `expires_in` da resposta de tokens.
 *
 * F4: `expires_in` é um inteiro de segundos (ex.: 900), distinto da string
 * '900s' passada ao @nestjs/jwt. Aceita também número puro de segundos.
 */
export function parseTtlToSeconds(ttl: string): number {
  const trimmed = ttl.trim()
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(trimmed)

  if (!match) {
    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      return Math.floor(asNumber)
    }
    throw new Error(`TTL inválido: ${ttl}`)
  }

  const value = Number(match[1])
  const unit = match[2] ?? 's'
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }

  return value * multipliers[unit]
}
