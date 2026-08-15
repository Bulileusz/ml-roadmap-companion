import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Flashcard, PhaseProgress } from '@/api/types'
import { HotkeysProvider } from '@/lib/hotkeys'
import { todayISO } from '@/lib/leitner'

import { Fiszki } from './Fiszki'

/** Data przesunięta o N dni od dziś — terminy w fixture mają być rozróżnialne. */
function inDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return todayISO(date)
}

function card(id: number, over: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    phase_id: 1,
    front: `Przód ${id}`,
    back: `Tył ${id}`,
    box: 2,
    next_review_at: todayISO(),
    learned_at: '2026-08-01 10:00:00',
    own_note: '',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-01 10:00:00',
    ...over,
  }
}

const CARDS: Flashcard[] = [
  card(1, { front: 'Co robi parametr k w KNN?', box: 3 }),
  card(2, { front: 'Czym jest gradient?', learned_at: null, box: 1 }),
  card(3, {
    front: 'Lasy losowe — po co?',
    phase_id: 2,
    box: 5,
    own_note: 'wiele drzew',
    next_review_at: inDays(4),
  }),
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

let calls: { method: string; url: string; body: unknown }[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderFiszki() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HotkeysProvider>
          <Fiszki />
        </HotkeysProvider>
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
          body: init?.body ? JSON.parse(String(init.body)) : null,
        })
      }
      if (url.endsWith('/api/flashcards')) return json(CARDS)
      if (url.endsWith('/api/phases')) return json(PHASES)
      return json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('Biblioteka fiszek', () => {
  it('pokazuje wszystkie fiszki z pudełkiem, fazą i terminem', async () => {
    renderFiszki()

    expect(await screen.findByText('Co robi parametr k w KNN?')).toBeInTheDocument()
    expect(screen.getByText('Pudełko 3')).toBeInTheDocument()
    expect(
      screen.getByText('3 fiszki · 1 do zapoznania · 2 w rotacji'),
    ).toBeInTheDocument()
    // Karta przed zapoznaniem nie ma pudełka ani terminu — ma stan.
    expect(screen.getByText('Nowa')).toBeInTheDocument()
    expect(screen.getByText('do zapoznania')).toBeInTheDocument()
    expect(screen.getByText('dziś')).toBeInTheDocument()
    expect(screen.getByText('za 4 dni')).toBeInTheDocument()
  })

  it('szuka bez trafiania w ogonki, także po notatce', async () => {
    renderFiszki()
    await screen.findByText('Lasy losowe — po co?')

    await userEvent.type(screen.getByPlaceholderText(/szukaj/i), 'lasy')
    expect(screen.getByText('Lasy losowe — po co?')).toBeInTheDocument()
    expect(screen.queryByText('Czym jest gradient?')).toBeNull()

    await userEvent.clear(screen.getByPlaceholderText(/szukaj/i))
    // „wiele drzew" siedzi w notatce — to często jedyne miejsce, gdzie
    // zapisałeś skojarzenie, po którym potem szukasz.
    await userEvent.type(screen.getByPlaceholderText(/szukaj/i), 'drzew')
    expect(screen.getByText('Lasy losowe — po co?')).toBeInTheDocument()
    expect(screen.queryByText('Co robi parametr k w KNN?')).toBeNull()
  })

  it('filtruje po fazie i po kolejce zapoznawczej', async () => {
    renderFiszki()
    await screen.findByText('Co robi parametr k w KNN?')

    await userEvent.click(screen.getByRole('button', { name: /^Ensemble methods/ }))
    expect(screen.getByText('Lasy losowe — po co?')).toBeInTheDocument()
    expect(screen.queryByText('Co robi parametr k w KNN?')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /^Wszystkie/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Do zapoznania/ }))
    expect(screen.getByText('Czym jest gradient?')).toBeInTheDocument()
    expect(screen.queryByText('Lasy losowe — po co?')).toBeNull()
  })

  it('pusty wynik mówi, co zrobić', async () => {
    renderFiszki()
    await screen.findByText('Co robi parametr k w KNN?')

    await userEvent.type(screen.getByPlaceholderText(/szukaj/i), 'transformery')

    expect(screen.getByText('Nic nie pasuje do tych filtrów.')).toBeInTheDocument()
  })

  it('edycja zapisuje się dopiero po zmianie i wysyła PATCH', async () => {
    renderFiszki()
    await userEvent.click(await screen.findByText('Co robi parametr k w KNN?'))

    // Przycisk wygaszony, dopóki nic się nie zmieniło.
    expect(screen.getByRole('button', { name: /bez zmian/i })).toBeDisabled()

    const note = screen.getByPlaceholderText(/opcjonalne/i)
    await userEvent.type(note, 'małe k łapie szum')
    await userEvent.click(screen.getByRole('button', { name: /zapisz zmiany/i }))

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: 'PATCH',
          url: '/api/flashcards/1',
          body: {
            front: 'Co robi parametr k w KNN?',
            back: 'Tył 1',
            own_note: 'małe k łapie szum',
            phase_id: 1,
          },
        },
      ]),
    )
  })

  it('usuwanie wymaga potwierdzenia', async () => {
    renderFiszki()
    await userEvent.click(await screen.findByText('Co robi parametr k w KNN?'))

    await userEvent.click(screen.getByRole('button', { name: /^usuń$/i }))

    expect(screen.getByText('Usunąć tę fiszkę na stałe?')).toBeInTheDocument()
    // Samo rozwinięcie potwierdzenia niczego nie kasuje.
    expect(calls).toEqual([])

    await userEvent.click(screen.getAllByRole('button', { name: /^usuń$/i })[0]!)

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'DELETE', url: '/api/flashcards/1', body: null },
      ]),
    )
  })

  it('przepięcie fazy idzie jako phase_id', async () => {
    renderFiszki()
    await userEvent.click(await screen.findByText('Co robi parametr k w KNN?'))

    const editor = screen.getByRole('combobox')
    await userEvent.selectOptions(editor, '2')
    await userEvent.click(screen.getByRole('button', { name: /zapisz zmiany/i }))

    await waitFor(() =>
      expect(calls[0]).toMatchObject({
        method: 'PATCH',
        url: '/api/flashcards/1',
        body: { phase_id: 2 },
      }),
    )
  })

  it('odpięcie od fazy wysyła null, nie pomija pola', async () => {
    renderFiszki()
    await userEvent.click(await screen.findByText('Co robi parametr k w KNN?'))

    await userEvent.selectOptions(screen.getByRole('combobox'), '')
    await userEvent.click(screen.getByRole('button', { name: /zapisz zmiany/i }))

    // null znaczy „odepnij"; pominięcie pola znaczyłoby „nie dotykaj".
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ phase_id: null }))
  })

  it('otwarcie drugiej fiszki zamyka pierwszą', async () => {
    renderFiszki()
    await userEvent.click(await screen.findByText('Co robi parametr k w KNN?'))
    expect(screen.getByDisplayValue('Tył 1')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Lasy losowe — po co?'))

    // waitFor, bo AnimatePresence trzyma zwijany edytor w drzewie do końca
    // animacji wyjścia — dopiero potem zostaje jeden.
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText(/opcjonalne/i)).toHaveLength(1),
    )
    expect(screen.getByDisplayValue('Tył 3')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Tył 1')).toBeNull()
  })
})
