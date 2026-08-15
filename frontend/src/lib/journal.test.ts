import { describe, expect, it } from 'vitest'

import type { JournalDay } from '@/api/types'

import { buildFeed, calendarCells, parseDay, weekdayIndex } from './journal'

function day(iso: string, over: Partial<JournalDay> = {}): JournalDay {
  return {
    day: iso,
    events: 4,
    reviewed: 4,
    introduced: 0,
    attempts: 0,
    independent: 0,
    tasks_done: 0,
    resources_done: 0,
    xp: 8,
    phases: [{ phase_id: 1, count: 4 }],
    note: '',
    ...over,
  }
}

describe('parseDay', () => {
  it('czyta datę w czasie lokalnym, nie jako północ UTC', () => {
    const date = parseDay('2026-08-15')

    // getDate(), nie getUTCDate(): to jest właśnie ta pomyłka, którą łapiemy -
    // przy odczycie w UTC na zachód od Greenwich wyszedłby 14.
    expect(date.getDate()).toBe(15)
    expect(date.getMonth()).toBe(7)
    expect(date.getFullYear()).toBe(2026)
  })

  it('liczy tydzień od poniedziałku', () => {
    // 15 sierpnia 2026 to sobota.
    expect(weekdayIndex('2026-08-15')).toBe(5)
    expect(weekdayIndex('2026-08-16')).toBe(6)
    expect(weekdayIndex('2026-08-17')).toBe(0)
  })
})

describe('buildFeed', () => {
  it('otwiera każdy miesiąc nagłówkiem z podsumowaniem', () => {
    const items = buildFeed([
      day('2026-08-15', { xp: 10 }),
      day('2026-08-14', { xp: 20 }),
      day('2026-07-31', { xp: 5 }),
    ])

    expect(items.map((item) => item.kind)).toEqual([
      'month',
      'day',
      'day',
      'month',
      'day',
    ])
    expect(items[0]).toMatchObject({ label: 'Sierpień 2026', days: 2, xp: 30 })
    expect(items[3]).toMatchObject({ label: 'Lipiec 2026', days: 1, xp: 5 })
  })

  it('nazywa przerwy między dniami nauki', () => {
    const items = buildFeed([day('2026-08-15'), day('2026-08-11')])

    expect(items[2]).toEqual({ kind: 'gap', key: 'g-2026-08-11', days: 3 })
  })

  it('nie robi przerwy z dnia na dzień ani przez granicę miesiąca', () => {
    const items = buildFeed([
      day('2026-08-02'),
      day('2026-08-01'),
      // Między 1 sierpnia a 28 lipca są trzy puste dni, ale rozdziela je
      // nagłówek miesiąca - dodatkowy znacznik mówiłby to samo dwa razy.
      day('2026-07-28'),
    ])

    expect(items.some((item) => item.kind === 'gap')).toBe(false)
  })

  it('z pustej listy robi pustą oś', () => {
    expect(buildFeed([])).toEqual([])
  })
})

describe('calendarCells', () => {
  it('dopełnia początek, żeby wiersze znaczyły dni tygodnia', () => {
    // Pierwszy dzień to sobota, więc przed nim jest pięć pustych pól.
    const cells = calendarCells([day('2026-08-15'), day('2026-08-16')])

    expect(cells.slice(0, 5)).toEqual([null, null, null, null, null])
    expect(cells).toHaveLength(7)
    expect(cells[5]).toMatchObject({ day: '2026-08-15' })
  })

  it('poniedziałek nie potrzebuje dopełnienia', () => {
    expect(calendarCells([day('2026-08-17')])).toHaveLength(1)
  })

  it('z pustego okna nie robi siatki', () => {
    expect(calendarCells([])).toEqual([])
  })
})
