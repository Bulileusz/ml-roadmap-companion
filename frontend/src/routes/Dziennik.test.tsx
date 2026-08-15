import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { JournalDay, PhaseProgress } from '@/api/types'

import { Dziennik } from './Dziennik'

function day(iso: string, over: Partial<JournalDay> = {}): JournalDay {
  return {
    day: iso,
    events: 0,
    reviewed: 0,
    introduced: 0,
    attempts: 0,
    independent: 0,
    tasks_done: 0,
    resources_done: 0,
    xp: 0,
    phases: [],
    note: '',
    ...over,
  }
}

function studied(iso: string, over: Partial<JournalDay> = {}): JournalDay {
  return day(iso, {
    events: 6,
    reviewed: 6,
    xp: 12,
    phases: [{ phase_id: 1, count: 6 }],
    ...over,
  })
}

/** Okno od 30 lipca do 15 sierpnia; sesje w kilku wybranych dniach. */
const DAYS: JournalDay[] = [
  day('2026-07-30'),
  studied('2026-07-31', { xp: 7 }),
  day('2026-08-01'),
  day('2026-08-02'),
  day('2026-08-03'),
  studied('2026-08-04', { note: 'Regresja logistyczna wreszcie kliknęła.' }),
  day('2026-08-05'),
  day('2026-08-06'),
  day('2026-08-07'),
  day('2026-08-08'),
  day('2026-08-09'),
  day('2026-08-10'),
  day('2026-08-11'),
  day('2026-08-12'),
  day('2026-08-13'),
  studied('2026-08-14', {
    events: 9,
    reviewed: 5,
    introduced: 2,
    attempts: 2,
    independent: 1,
    xp: 25,
    phases: [
      { phase_id: 1, count: 7 },
      { phase_id: 2, count: 2 },
    ],
  }),
  studied('2026-08-15', { xp: 30 }),
]

const PHASES: PhaseProgress[] = [
  {
    phase: { id: 1, code: '2', name: 'Faza 2 - Klasyczne ML od zera', order_index: 2 },
    done: 3,
    total: 6,
    pct: 50,
  },
  {
    phase: { id: 2, code: '2b', name: 'Faza 2b - Ensemble methods', order_index: 3 },
    done: 0,
    total: 5,
    pct: 0,
  },
]

const DASHBOARD = {
  streak: { current: 2, longest: 9, active_days: 4 },
  progression: { xp: 74, level: 2, xp_into_level: 24, xp_for_next_level: 100, pct: 24 },
}

let calls: { method: string; url: string; body: unknown }[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderDziennik() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dziennik />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method !== 'GET') {
        calls.push({
          method,
          url,
          body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
        })
      }
      if (url.includes('/api/journal/days')) return json(DAYS)
      if (url.endsWith('/api/phases')) return json(PHASES)
      if (url.endsWith('/api/dashboard')) return json(DASHBOARD)
      if (url.includes('/note')) {
        const body = JSON.parse(String(init?.body)) as { note: string }
        return json({ day: url.split('/')[4], note: body.note })
      }
      return json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('Dziennik', () => {
  it('podsumowuje okno: seria, dni z sesją, powtórki i XP', async () => {
    renderDziennik()
    await screen.findByText('dni z sesją na 91')

    // Liczba nad podpisem — same cyfry są w tym widoku wieloznaczne, bo
    // numery dni wyglądają tak samo.
    const wartosc = (label: string) =>
      screen.getByText(label).previousElementSibling?.textContent

    expect(wartosc('dni serii')).toBe('2')
    expect(wartosc('dni z sesją na 91')).toBe('4')
    expect(wartosc('XP w tym oknie')).toBe('74')
    expect(wartosc('powtórek, 50% samodzielnie')).toBe('23')
    expect(screen.getByText('od 30 lipca 2026')).toBeInTheDocument()
  })

  it('układa dni od najnowszego, z nagłówkiem miesiąca i nazwaną przerwą', async () => {
    renderDziennik()
    await screen.findByText('Sierpień 2026')

    expect(screen.getByText('Lipiec 2026')).toBeInTheDocument()
    // Między 14 a 4 sierpnia leży dziewięć dni bez sesji.
    expect(screen.getByText('9 dni przerwy')).toBeInTheDocument()
    expect(screen.getByText('4 wpisy')).toBeInTheDocument()
  })

  it('opisuje dzień składnikami, nie samą liczbą zdarzeń', async () => {
    renderDziennik()
    await screen.findByText('Sierpień 2026')

    expect(
      screen.getByText('5 powtórek · 2 nowe · 2 pytania, 50% samodzielnie'),
    ).toBeInTheDocument()
    // Dzień o dwóch fazach wymienia obie, od tej, w której było więcej ruchu.
    expect(
      screen.getByText('Klasyczne ML od zera · Ensemble methods'),
    ).toBeInTheDocument()
    expect(screen.getByText('+25 XP')).toBeInTheDocument()
  })

  it('zapisuje dopisaną notatkę do właściwego dnia', async () => {
    renderDziennik()
    await screen.findByText('Sierpień 2026')

    await userEvent.click(screen.getAllByRole('button', { name: 'Dopisz notatkę' })[0]!)
    await userEvent.type(
      screen.getByPlaceholderText(/co dziś weszło/i),
      'Powtórki poszły gładko.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: 'PUT',
          url: '/api/journal/days/2026-08-15/note',
          body: { note: 'Powtórki poszły gładko.' },
        },
      ]),
    )
  })

  it('istniejącą notatkę otwiera do edycji i pozwala usunąć', async () => {
    renderDziennik()
    await userEvent.click(
      await screen.findByText('Regresja logistyczna wreszcie kliknęła.'),
    )

    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Usuń notatkę' }))

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: 'PUT',
          url: '/api/journal/days/2026-08-04/note',
          body: { note: '' },
        },
      ]),
    )
  })

  it('filtr „z notatką" zostawia tylko opisane dni', async () => {
    renderDziennik()
    await screen.findByText('Sierpień 2026')

    await userEvent.click(screen.getByRole('button', { name: /^Z notatką/ }))

    expect(
      screen.getByText('Regresja logistyczna wreszcie kliknęła.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 wpis')).toBeInTheDocument()
  })

  it('kliknięcie w dzień kalendarza zawęża strumień do niego', async () => {
    renderDziennik()
    await screen.findByText('Sierpień 2026')

    await userEvent.click(screen.getByTitle('14 sierpnia — 5 powtórek, +25 XP'))

    expect(screen.getByText('1 wpis')).toBeInTheDocument()
    expect(screen.getByText('+25 XP')).toBeInTheDocument()
    expect(screen.queryByText('+30 XP')).toBeNull()

    await userEvent.click(
      screen.getByRole('button', { name: 'Pokaż z powrotem wszystkie dni' }),
    )
    expect(screen.getByText('4 wpisy')).toBeInTheDocument()
  })

  it('dzień bez sesji nie jest klikalny i mówi to wprost', async () => {
    renderDziennik()
    await screen.findByText('Sierpień 2026')

    const wolny = screen.getByTitle('10 sierpnia — bez sesji')

    expect(wolny.tagName).toBe('SPAN')
  })
})
