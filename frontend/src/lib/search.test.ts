import { describe, expect, it } from 'vitest'

import { fold, matches } from './search'

describe('fold', () => {
  it('zdejmuje ogonki i wielkość liter', () => {
    expect(fold('Regresja Logistyczna')).toBe('regresja logistyczna')
    expect(fold('lasów')).toBe('lasow')
    expect(fold('ĄĆĘŃÓŚŹŻ')).toBe('acenoszz')
  })

  it('radzi sobie z ł, które nie ma rozkładu Unicode', () => {
    // NFD nie rozbija „ł" na literę i znak diakrytyczny — to osobna litera.
    expect(fold('Wykładnicza')).toBe('wykladnicza')
    expect(fold('błąd')).toBe('blad')
  })
})

describe('matches', () => {
  it('znajduje bez trafiania w ogonki', () => {
    expect(matches('Regresja logistyczna', 'regresja')).toBe(true)
    expect(matches('Lasy losowe', 'lasow')).toBe(false)
    expect(matches('Drzewa i lasów użycie', 'lasow')).toBe(true)
  })

  it('puste zapytanie przepuszcza wszystko', () => {
    expect(matches('cokolwiek', '')).toBe(true)
    expect(matches('cokolwiek', '   ')).toBe(true)
  })

  it('nie znajduje tego, czego nie ma', () => {
    expect(matches('Regresja liniowa', 'sieci')).toBe(false)
  })
})
