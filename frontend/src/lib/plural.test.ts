import { describe, expect, it } from 'vitest'

import { ATTEMPTS, CARDS, DAYS, counted, plural } from './plural'

describe('plural', () => {
  it('odmienia fiszki przez wszystkie trzy formy', () => {
    expect(plural(1, CARDS)).toBe('fiszka')
    expect(plural(2, CARDS)).toBe('fiszki')
    expect(plural(3, CARDS)).toBe('fiszki')
    expect(plural(4, CARDS)).toBe('fiszki')
    expect(plural(5, CARDS)).toBe('fiszek')
    expect(plural(11, CARDS)).toBe('fiszek')
  })

  it('łapie pułapkę 12-14, gdzie końcówka kłamie', () => {
    // 12 kończy się na 2, ale to "fiszek", nie "fiszki" - na tym wykłada się
    // każda ręczna implementacja na n % 10.
    expect(plural(12, CARDS)).toBe('fiszek')
    expect(plural(13, CARDS)).toBe('fiszek')
    expect(plural(14, CARDS)).toBe('fiszek')
    expect(plural(22, CARDS)).toBe('fiszki')
    expect(plural(112, CARDS)).toBe('fiszek')
    expect(plural(122, CARDS)).toBe('fiszki')
  })

  it('zero jest w formie dopełniaczowej', () => {
    expect(plural(0, CARDS)).toBe('fiszek')
    expect(plural(0, DAYS)).toBe('dni')
  })

  it('dni są nieodmienne poza liczbą pojedynczą', () => {
    expect(plural(1, DAYS)).toBe('dzień')
    expect(plural(2, DAYS)).toBe('dni')
    expect(plural(7, DAYS)).toBe('dni')
  })

  it('odmienia rzeczowniki rodzaju nijakiego', () => {
    expect(counted(1, ATTEMPTS)).toBe('1 podejście')
    expect(counted(3, ATTEMPTS)).toBe('3 podejścia')
    expect(counted(9, ATTEMPTS)).toBe('9 podejść')
  })

  it('counted składa liczbę ze słowem', () => {
    expect(counted(1, CARDS)).toBe('1 fiszka')
    expect(counted(13, CARDS)).toBe('13 fiszek')
  })
})
