import { describe, it, expect } from 'vitest'
import { lagosDateKey, lagosDayStartUtc, formatLagos } from './lagos'

describe('lagos date helpers', () => {
  it('renders a UTC instant as a Lagos calendar day', () => {
    // 2026-04-19T23:30:00Z is 2026-04-20T00:30 in Lagos (UTC+1)
    expect(lagosDateKey('2026-04-19T23:30:00Z')).toBe('2026-04-20')
  })

  it('round-trips a Lagos day key to its UTC start', () => {
    // 2026-04-20 at 00:00 Lagos is 2026-04-19T23:00Z
    const utc = lagosDayStartUtc('2026-04-20')
    expect(utc.toISOString()).toBe('2026-04-19T23:00:00.000Z')
  })

  it('formats with a custom pattern', () => {
    expect(formatLagos('2026-04-19T12:00:00Z', 'HH:mm')).toBe('13:00')
  })
})
