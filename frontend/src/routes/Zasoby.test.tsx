import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PhaseProgress, Resource } from '@/api/types'

import { Zasoby } from './Zasoby'

function resource(id: number, over: Partial<Resource> = {}): Resource {
  return {
    id,
    phase_id: 1,
    title: `Materiał ${id}`,
    url: '',
    kind: 'other',
    detail: '',
    status: 'todo',
    order_index: id,
    ...over,
  }
}

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

const PHASE_1: Resource[] = [
  resource(1, {
    title: 'Introduction to Statistical Learning',
    url: 'https://www.statlearning.com/rozdzial',
    kind: 'book',
    status: 'in_progress',
    detail: 'Rozdziały 3-4',
  }),
  resource(2, { title: 'Kurs Andrew Nga', kind: 'course', status: 'done' }),
  resource(3, { title: 'Dokumentacja scikit-learn', kind: 'docs' }),
]

let calls: { method: string; url: string; body: unknown }[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderZasoby() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Zasoby />
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
      if (url.endsWith('/api/phases')) return json(PHASES)
      if (url.includes('/api/resources?phase_id=1')) return json(PHASE_1)
      if (url.includes('/api/resources?phase_id=2')) return json([])
      return json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('Zasoby', () => {
  it('pokazuje materiały fazy razem z rodzajem i postępem', async () => {
    renderZasoby()

    expect(
      await screen.findByText('Introduction to Statistical Learning'),
    ).toBeInTheDocument()
    expect(screen.getByText('Książka')).toBeInTheDocument()
    expect(screen.getByText('przerobione 1 z 3')).toBeInTheDocument()
    expect(screen.getByText('statlearning.com ↗')).toBeInTheDocument()
  })

  it('kliknięcie w znaczek przestawia stan na następny', async () => {
    renderZasoby()
    await screen.findByText('Dokumentacja scikit-learn')

    await userEvent.click(screen.getByRole('button', { name: 'Stan: do zrobienia' }))

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'PATCH', url: '/api/resources/3', body: { status: 'in_progress' } },
      ]),
    )
  })

  it('filtruje po stanie', async () => {
    renderZasoby()
    await screen.findByText('Kurs Andrew Nga')

    await userEvent.click(screen.getByRole('button', { name: /^przerobione/ }))

    expect(screen.getByText('Kurs Andrew Nga')).toBeInTheDocument()
    expect(screen.queryByText('Dokumentacja scikit-learn')).toBeNull()
  })

  it('szuka po tytule i opisie', async () => {
    renderZasoby()
    await screen.findByText('Kurs Andrew Nga')

    await userEvent.type(screen.getByPlaceholderText(/szukaj/i), 'rozdzialy')

    expect(screen.getByText('Introduction to Statistical Learning')).toBeInTheDocument()
    expect(screen.queryByText('Kurs Andrew Nga')).toBeNull()
  })

  it('edycja linku idzie jednym PATCH-em razem z tytułem i opisem', async () => {
    renderZasoby()
    await userEvent.click(await screen.findByText('Dokumentacja scikit-learn'))

    await userEvent.type(
      screen.getByPlaceholderText(/opcjonalny/i),
      'https://sklearn.org',
    )
    await userEvent.click(screen.getByRole('button', { name: /zapisz zmiany/i }))

    await waitFor(() =>
      expect(calls[0]).toMatchObject({
        method: 'PATCH',
        url: '/api/resources/3',
        body: {
          title: 'Dokumentacja scikit-learn',
          url: 'https://sklearn.org',
          detail: '',
          phase_id: 1,
        },
      }),
    )
  })

  it('usuwanie wymaga potwierdzenia', async () => {
    renderZasoby()
    await userEvent.click(await screen.findByText('Dokumentacja scikit-learn'))

    await userEvent.click(screen.getByRole('button', { name: /^usuń$/i }))
    expect(screen.getByText('Usunąć ten materiał?')).toBeInTheDocument()
    expect(calls).toEqual([])

    await userEvent.click(screen.getAllByRole('button', { name: /^usuń$/i })[0]!)

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'DELETE', url: '/api/resources/3', body: null },
      ]),
    )
  })

  it('faza bez materiałów mówi, skąd się biorą', async () => {
    renderZasoby()
    await screen.findByText('Kurs Andrew Nga')

    await userEvent.click(screen.getByRole('button', { name: /^Ensemble methods/ }))

    expect(
      await screen.findByText('Ta faza nie ma jeszcze materiałów.'),
    ).toBeInTheDocument()
  })
})
