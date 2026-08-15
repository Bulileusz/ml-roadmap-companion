import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PhaseProgress, QuestionWithStats } from '@/api/types'
import { HotkeysProvider } from '@/lib/hotkeys'

import { Pytania } from './Pytania'

function question(
  id: number,
  over: Partial<QuestionWithStats> = {},
): QuestionWithStats {
  return {
    id,
    phase_id: 1,
    question_text: `Pytanie ${id}`,
    question_type: 'concept',
    answer: `Odpowiedź ${id}`,
    created_at: '2026-08-01 10:00:00',
    stats: { total: 0, independent: 0, pct: 0 },
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

const PHASE_1: QuestionWithStats[] = [
  question(1, {
    question_text: 'Czym jest bias-variance tradeoff?',
    stats: { total: 4, independent: 3, pct: 75 },
  }),
  question(2, {
    question_text: 'Napisz pętlę uczącą w NumPy',
    question_type: 'code',
    answer: '',
  }),
]

const PHASE_2: QuestionWithStats[] = [
  question(9, { phase_id: 2, question_text: 'Jak działa bagging?' }),
]

let calls: { method: string; url: string; body: unknown }[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderPytania() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HotkeysProvider>
          <Pytania />
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
          body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
        })
      }
      if (url.endsWith('/api/phases')) return json(PHASES)
      if (url.includes('/api/questions?phase_id=1')) return json(PHASE_1)
      if (url.includes('/api/questions?phase_id=2')) return json(PHASE_2)
      if (url.includes('/attempts')) return json({ total: 5, independent: 4, pct: 80 })
      return json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('Bank pytań', () => {
  it('otwiera się na fazie, w której właśnie jesteś', async () => {
    renderPytania()

    expect(
      await screen.findByText('Czym jest bias-variance tradeoff?'),
    ).toBeInTheDocument()
    expect(screen.getByText('Napisz pętlę uczącą w NumPy')).toBeInTheDocument()
    // Pytania z innej fazy nie są tu filtrem, tylko osobnym pobraniem.
    expect(screen.queryByText('Jak działa bagging?')).toBeNull()
    expect(screen.getByText('2 pytania · 75% samodzielnie')).toBeInTheDocument()
  })

  it('pokazuje historię samodzielności przy pytaniu', async () => {
    renderPytania()
    await screen.findByText('Czym jest bias-variance tradeoff?')

    expect(screen.getByText('3 z 4 · 75%')).toBeInTheDocument()
    expect(screen.getByText('bez podejść')).toBeInTheDocument()
  })

  it('przełącznik fazy pobiera pytania tamtej fazy', async () => {
    renderPytania()
    await screen.findByText('Czym jest bias-variance tradeoff?')

    await userEvent.click(screen.getByRole('button', { name: /^Ensemble methods/ }))

    expect(await screen.findByText('Jak działa bagging?')).toBeInTheDocument()
    expect(screen.queryByText('Czym jest bias-variance tradeoff?')).toBeNull()
  })

  it('szuka w treści i w odpowiedziach, bez trafiania w ogonki', async () => {
    renderPytania()
    await screen.findByText('Czym jest bias-variance tradeoff?')

    await userEvent.type(screen.getByPlaceholderText(/szukaj/i), 'petle')

    expect(screen.getByText('Napisz pętlę uczącą w NumPy')).toBeInTheDocument()
    expect(screen.queryByText('Czym jest bias-variance tradeoff?')).toBeNull()
  })

  it('filtruje po typie pytania', async () => {
    renderPytania()
    await screen.findByText('Czym jest bias-variance tradeoff?')

    await userEvent.click(screen.getByRole('button', { name: /^Kod/ }))

    expect(screen.getByText('Napisz pętlę uczącą w NumPy')).toBeInTheDocument()
    expect(screen.queryByText('Czym jest bias-variance tradeoff?')).toBeNull()
  })

  it('odpowiedź jest zasłonięta, dopóki jej nie odsłonisz', async () => {
    renderPytania()
    await userEvent.click(await screen.findByText('Czym jest bias-variance tradeoff?'))

    expect(screen.queryByText('Odpowiedź 1')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /pokaż odpowiedź/i }))

    expect(screen.getByText('Odpowiedź 1')).toBeInTheDocument()
  })

  it('zapisuje podejście rozwiązane samodzielnie', async () => {
    renderPytania()
    await userEvent.click(await screen.findByText('Czym jest bias-variance tradeoff?'))

    await userEvent.click(screen.getByRole('button', { name: /umiałem sam/i }))

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: 'POST',
          url: '/api/questions/1/attempts',
          body: { solved_independently: true },
        },
      ]),
    )
  })

  it('„musiałem sprawdzić" od razu odsłania odpowiedź', async () => {
    renderPytania()
    await userEvent.click(await screen.findByText('Czym jest bias-variance tradeoff?'))

    await userEvent.click(screen.getByRole('button', { name: /musiałem sprawdzić/i }))

    expect(screen.getByText('Odpowiedź 1')).toBeInTheDocument()
    await waitFor(() => expect(calls[0]?.body).toEqual({ solved_independently: false }))
  })

  it('edycja wysyła PATCH dopiero po zmianie', async () => {
    renderPytania()
    await userEvent.click(await screen.findByText('Czym jest bias-variance tradeoff?'))
    await userEvent.click(screen.getByRole('button', { name: /edytuj/i }))

    expect(screen.getByRole('button', { name: /bez zmian/i })).toBeDisabled()

    await userEvent.type(screen.getByDisplayValue('Odpowiedź 1'), ' plus wariancja')
    await userEvent.click(screen.getByRole('button', { name: /zapisz zmiany/i }))

    await waitFor(() =>
      expect(calls[0]).toMatchObject({
        method: 'PATCH',
        url: '/api/questions/1',
        body: { answer: 'Odpowiedź 1 plus wariancja', question_type: 'concept' },
      }),
    )
  })

  it('usuwanie wymaga potwierdzenia', async () => {
    renderPytania()
    await userEvent.click(await screen.findByText('Czym jest bias-variance tradeoff?'))
    await userEvent.click(screen.getByRole('button', { name: /edytuj/i }))
    await userEvent.click(screen.getByRole('button', { name: /^usuń$/i }))

    expect(
      screen.getByText('Usunąć pytanie razem z historią podejść?'),
    ).toBeInTheDocument()
    expect(calls).toEqual([])

    await userEvent.click(screen.getAllByRole('button', { name: /^usuń$/i })[0]!)

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'DELETE', url: '/api/questions/1', body: null },
      ]),
    )
  })

  it('faza bez pytań mówi, skąd się biorą', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.endsWith('/api/phases')) return json(PHASES)
        return json([])
      }),
    )
    renderPytania()

    expect(await screen.findByText('Ta faza nie ma jeszcze pytań.')).toBeInTheDocument()
    expect(screen.getByText(/content\//)).toBeInTheDocument()
  })
})
