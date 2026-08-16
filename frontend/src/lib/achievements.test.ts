import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Achievement } from '@/api/types'

import {
  freshlyUnlocked,
  isBigDeal,
  phaseCodeOf,
  readSeen,
  unlockedIds,
  writeSeen,
} from './achievements'

function odznaka(id: string, unlocked: boolean): Achievement {
  return { id, label: id, hint: `Zdobądź ${id}.`, icon: 'Flame', unlocked }
}

const ZBIOR: Achievement[] = [
  odznaka('streak-7', true),
  odznaka('reviews-100', true),
  odznaka('reviews-500', false),
  odznaka('phase-2', false),
]

describe('freshlyUnlocked', () => {
  it('zwraca to, co doszło od ostatniego spojrzenia', () => {
    const swieze = freshlyUnlocked(['streak-7'], ZBIOR)

    expect(swieze.map((item) => item.id)).toEqual(['reviews-100'])
  })

  it('przy pierwszym uruchomieniu nie świętuje niczego', () => {
    // Ktoś uczy się od miesiąca i pierwszy raz odpala nową wersję apki —
    // osiem odznak naraz na twarz to nie celebracja, tylko hałas.
    expect(freshlyUnlocked(null, ZBIOR)).toEqual([])
  })

  it('pusta pamięć to nie to samo co brak pamięci', () => {
    // [] znaczy „widziałem i nie było nic" — więc wszystko zdobyte jest nowe.
    expect(freshlyUnlocked([], ZBIOR).map((item) => item.id)).toEqual([
      'streak-7',
      'reviews-100',
    ])
  })

  it('niezdobyte nigdy nie są świeże, nawet jeśli nieznane', () => {
    expect(freshlyUnlocked([], ZBIOR).some((item) => item.id === 'phase-2')).toBe(false)
  })

  it('nic nowego to pusta lista', () => {
    expect(freshlyUnlocked(['streak-7', 'reviews-100'], ZBIOR)).toEqual([])
  })
})

describe('isBigDeal', () => {
  it('faza i poziom są dużym wydarzeniem, reszta nie', () => {
    expect(isBigDeal([odznaka('phase-2', true)])).toBe(true)
    expect(isBigDeal([odznaka('level-5', true)])).toBe(true)
    expect(isBigDeal([odznaka('reviews-100', true)])).toBe(false)
    // Wystarczy jedno duże w partii.
    expect(isBigDeal([odznaka('reviews-100', true), odznaka('phase-0', true)])).toBe(
      true,
    )
  })
})

describe('phaseCodeOf', () => {
  it('wyłuskuje kod fazy z id, także dwuznakowy', () => {
    expect(phaseCodeOf('phase-0')).toBe('0')
    expect(phaseCodeOf('phase-2b')).toBe('2b')
  })

  it('osiągnięcie spoza fazy nie ma kodu', () => {
    expect(phaseCodeOf('reviews-100')).toBeUndefined()
  })
})

describe('pamięć widzianych', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('zapis i odczyt zachowują listę', () => {
    writeSeen(unlockedIds(ZBIOR))

    expect(readSeen()).toEqual(['streak-7', 'reviews-100'])
  })

  it('brak wpisu daje null, nie pustą listę', () => {
    expect(readSeen()).toBeNull()
  })

  it('uszkodzony wpis nie wysadza apki', () => {
    localStorage.setItem('ml-roadmap:widziane-osiagniecia', '{to nie jest JSON')

    // Najwyżej celebracja się nie odpali — to nie powód, żeby nie dało się
    // otworzyć podsumowania sesji.
    expect(readSeen()).toBeNull()
  })
})
