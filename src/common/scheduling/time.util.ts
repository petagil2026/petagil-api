/**
 * Helpers puros de conversão entre "HH:MM" (zero-padded) e minutos-do-dia.
 *
 * Neutros de domínio e de fuso — reusáveis por qualquer lado de oferta
 * (clínica/vet hoje; passeador no futuro). Sem dependências.
 */

/** "08:00" → 480. Assume formato já validado ("HH:MM"). */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

/** 480 → "08:00". SEMPRE zero-padded (convenção 1 da spec). */
export function minutesToHhmm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
