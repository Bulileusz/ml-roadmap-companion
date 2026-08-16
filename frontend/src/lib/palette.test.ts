import { describe, expect, it } from 'vitest'

import type { Flashcard } from '@/api/types'

import { CARD_LIMIT, buildCommands, cardCommands, moveSelection } from './palette'

function card(id: number, front: string, back = 'Tył'): Flashcard {
  return {
    id,
    phase_id: 1,
    front,
    back,
    box: 2,
    next_review_at: '2026-08-15',
    learned_at: '2026-08-01 10:00:00',
    own_note: '',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-01 10:00:00',
  }
}

const FISZKI: Flashcard[] = [
  card(1, 'Czym jest gradient?', 'Wektor pochodnych cząstkowych'),
  card(2, 'Lasy losowe — po co?'),
  card(3, 'Regresja logistyczna'),
]

describe('buildCommands', () => {
  it('bez zapytania pokazuje nawigację i akcje, ale nie fiszki', () => {
    const commands = buildCommands(FISZKI, '')

    // Paleta otwarta na siedemdziesięciu fiszkach to nie paleta, tylko
    // biblioteka — treść wchodzi dopiero, gdy o nią poprosisz.
    expect(commands.some((c) => c.group === 'Fiszki')).toBe(false)
    expect(commands.filter((c) => c.group === 'Nawigacja')).toHaveLength(7)
    expect(commands.find((c) => c.id === 'act:sesja')?.chord).toBe('s')
  })

  it('zachowuje kolejność grup: nawigacja, akcje, dopiero treść', () => {
    const grupy = buildCommands(FISZKI, 'gradient').map((c) => c.group)

    expect(grupy.indexOf('Fiszki')).toBeGreaterThan(grupy.lastIndexOf('Akcje'))
  })

  it('szuka bez trafiania w ogonki, także po nazwach ekranów', () => {
    const commands = buildCommands(FISZKI, 'dzien')

    // „Dziennik" ma znaleźć się po „dzien", bez ogonka.
    expect(commands.some((c) => c.to === '/dziennik')).toBe(true)
  })

  it('nietrafione zapytanie daje pustą listę zamiast wszystkiego', () => {
    expect(buildCommands(FISZKI, 'transformery')).toEqual([])
  })
})

describe('cardCommands', () => {
  it('szuka w przodzie i w tyle fiszki', () => {
    expect(cardCommands(FISZKI, 'gradient')).toHaveLength(1)
    expect(cardCommands(FISZKI, 'pochodnych')[0]?.label).toBe('Czym jest gradient?')
  })

  it('niesie zapytanie do biblioteki, nie samo id', () => {
    // Dzięki `q` karta ląduje na górze przefiltrowanej listy, zamiast być
    // otwarta gdzieś pod pięćdziesiątym wierszem.
    expect(cardCommands(FISZKI, 'lasy')[0]?.to).toBe('/fiszki?q=lasy&karta=2')
  })

  it('koduje znaki specjalne w zapytaniu', () => {
    expect(cardCommands(FISZKI, 'po co?')[0]?.to).toBe('/fiszki?q=po%20co%3F&karta=2')
  })

  it('nie wysypuje listy przy szerokim zapytaniu', () => {
    const duzo = Array.from({ length: 30 }, (_, index) =>
      card(index + 10, `Pytanie ${index}`),
    )

    expect(cardCommands(duzo, 'pytanie')).toHaveLength(CARD_LIMIT)
  })
})

describe('moveSelection', () => {
  it('zawija się na obu końcach', () => {
    expect(moveSelection(0, 1, 3)).toBe(1)
    expect(moveSelection(2, 1, 3)).toBe(0)
    // Strzałka w górę z pierwszej pozycji ma trafić na ostatnią, a nie
    // zatrzymać się i sprawiać wrażenie zaciętego klawisza.
    expect(moveSelection(0, -1, 3)).toBe(2)
  })

  it('pusta lista zostaje na zerze', () => {
    expect(moveSelection(0, 1, 0)).toBe(0)
  })
})
