import { describe, expect, it } from 'vitest'

import {
  BOX_INTERVALS_DAYS,
  dueLabel,
  todayISO,
  MAX_BOX,
  MIN_BOX,
  intervalDays,
  nextBox,
  promotionLabel,
  whenLabel,
} from './leitner'

describe('nextBox', () => {
  it('trafienie awansuje o jedno pudełko', () => {
    expect(nextBox(1, true)).toBe(2)
    expect(nextBox(4, true)).toBe(5)
  })

  it('z ostatniego pudełka nie ma dokąd awansować', () => {
    expect(nextBox(MAX_BOX, true)).toBe(MAX_BOX)
  })

  it('wpadka cofa do pierwszego pudełka z każdego', () => {
    for (let box = MIN_BOX; box <= MAX_BOX; box += 1) {
      expect(nextBox(box, false)).toBe(MIN_BOX)
    }
  })
})

describe('intervalDays', () => {
  it('zgadza się z tabelą backendu', () => {
    // Te same wartości co BOX_INTERVALS_DAYS w services/spaced_repetition.py.
    // Rozjazd oznacza, że przycisk obiecuje termin, którego backend nie ustawi.
    expect(BOX_INTERVALS_DAYS).toEqual({ 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 })
  })

  it('przycina pudełka spoza zakresu zamiast zwracać undefined', () => {
    // Pudełko spoza 1-5 nie powinno się zdarzyć, ale podpis przycisku nie jest
    // miejscem, w którym warto się o to wywalać.
    expect(intervalDays(0)).toBe(1)
    expect(intervalDays(9)).toBe(14)
  })
})

describe('whenLabel', () => {
  it('jeden dzień ma własne słowo', () => {
    expect(whenLabel(1)).toBe('jutro')
    expect(whenLabel(2)).toBe('za 2 dni')
    expect(whenLabel(14)).toBe('za 14 dni')
  })
})

describe('promotionLabel', () => {
  it('mówi dokąd karta pojedzie i na jak długo', () => {
    expect(promotionLabel(1)).toBe('za 2 dni · pudełko 2')
    expect(promotionLabel(2)).toBe('za 4 dni · pudełko 3')
    expect(promotionLabel(3)).toBe('za 7 dni · pudełko 4')
    expect(promotionLabel(4)).toBe('za 14 dni · pudełko 5')
  })

  it('w ostatnim pudełku obiecuje to samo pudełko', () => {
    expect(promotionLabel(5)).toBe('za 14 dni · pudełko 5')
  })
})

describe('dueLabel', () => {
  const today = '2026-08-15'

  it('rozróżnia dziś, jutro i dalej', () => {
    expect(dueLabel('2026-08-15', today)).toBe('dziś')
    expect(dueLabel('2026-08-16', today)).toBe('jutro')
    expect(dueLabel('2026-08-19', today)).toBe('za 4 dni')
  })

  it('zaległość ma własne słowo, nie ujemne dni', () => {
    expect(dueLabel('2026-08-14', today)).toBe('zaległa o 1 dzień')
    expect(dueLabel('2026-08-12', today)).toBe('zaległa o 3 dni')
  })

  it('przechodzi przez granicę miesiąca', () => {
    expect(dueLabel('2026-09-01', '2026-08-31')).toBe('jutro')
  })
})

describe('todayISO', () => {
  it('liczy czasem lokalnym, nie UTC', () => {
    // 23:30 czasu lokalnego to wciąż ten sam dzień, choć w UTC bywa następny.
    const late = new Date(2026, 7, 15, 23, 30)
    expect(todayISO(late)).toBe('2026-08-15')
  })
})
