import { describe, expect, it } from 'vitest'

import { arcDash } from './ring'

describe('arcDash', () => {
  const radius = 40
  const full = 2 * Math.PI * radius

  it('zero procent zostawia kreskę cofniętą o cały obwód', () => {
    expect(arcDash(0, radius)).toEqual({ circumference: full, offset: full })
  })

  it('sto procent domyka pierścień', () => {
    expect(arcDash(100, radius).offset).toBeCloseTo(0)
  })

  it('połowa cofa kreskę o połowę obwodu', () => {
    expect(arcDash(50, radius).offset).toBeCloseTo(full / 2)
  })

  it('przycina wartości poza zakresem', () => {
    // API liczy procenty na floatach, więc 100.00000001 jest realne - ujemne
    // przesunięcie domykałoby łuk z drugiej strony i wyglądało jak błąd.
    expect(arcDash(103, radius).offset).toBeCloseTo(0)
    expect(arcDash(-5, radius).offset).toBeCloseTo(full)
  })
})
