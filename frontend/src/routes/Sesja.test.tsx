import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Flashcard, Question, SessionPlan } from '@/api/types'
import { HotkeysProvider } from '@/lib/hotkeys'

import { Sesja } from './Sesja'

// canvas-confetti rysuje po <canvas>, którego jsdom nie implementuje.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

/* Test przebiegu sesji od pierwszej karty do rachunku XP. To jedyne miejsce,
 * w którym widać razem maszynę stanu, wywołania API i ekrany — a większość
 * błędów tego PR-a mieszkałaby właśnie na tych stykach. */

function card(id: number, over: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    phase_id: 1,
    front: `Przód ${id}`,
    back: `Tył ${id}`,
    box: 2,
    next_review_at: '2026-08-15',
    learned_at: '2026-08-01 10:00:00',
    own_note: '',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-01 10:00:00',
    ...over,
  }
}

const PLAN: SessionPlan = {
  intro: [card(1, { learned_at: null, box: 1, front: 'Czym jest gradient?' })],
  reviews: [card(2, { front: 'Co robi parametr k?', box: 2 }), card(3, { box: 4 })],
  reviews_remaining: 0,
  questions: [
    {
      id: 9,
      phase_id: 1,
      question_text: 'Dlaczego accuracy bywa myląca?',
      question_type: 'concept',
      answer: 'Przy rzadkiej klasie model odpowiadający zawsze „nie" ma 99%.',
      created_at: '2026-08-01 10:00:00',
    } satisfies Question,
  ],
  phase: { id: 1, code: '2', name: 'Faza 2 - Klasyczne ML od zera', order_index: 2 },
  next_task: {
    id: 7,
    phase_id: 1,
    title: 'Granice decyzyjne',
    phase_name: 'Faza 2 - Klasyczne ML od zera',
  },
  total_steps: 4,
  estimated_minutes: 4,
}

let calls: { method: string; url: string; body: unknown }[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function stubFetch() {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (method !== 'GET') {
      calls.push({
        method,
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      })
    }
    if (url.endsWith('/api/session/today')) return json(PLAN)
    if (url.includes('/review') || url.includes('/intro')) return json(card(2))
    if (url.includes('/attempts')) return json({ independent: 1, total: 1, pct: 100 })
    if (method === 'PATCH') return json(card(1))
    return json({})
  })
}

function renderSesja() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/sesja']}>
        <HotkeysProvider>
          <Routes>
            <Route path="/sesja" element={<Sesja />} />
            <Route path="/" element={<p>ekran startowy</p>} />
          </Routes>
        </HotkeysProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Przeklikuje kartę zapoznawczą, żeby dojść do powtórek. */
async function passIntro() {
  await userEvent.click(await screen.findByRole('button', { name: /rozumiem, dalej/i }))
}

beforeEach(() => {
  calls = []
  vi.stubGlobal('fetch', stubFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Sesja', () => {
  it('zaczyna od karty zapoznawczej, bez oceniania', async () => {
    renderSesja()

    expect(await screen.findByText('Czym jest gradient?')).toBeInTheDocument()
    expect(screen.getByText(/bez oceniania/i)).toBeInTheDocument()
    // Pierwszy kontakt z materiałem nie jest testem — nie ma czego oceniać.
    expect(screen.queryByRole('button', { name: /nie umiałem/i })).toBeNull()
    expect(screen.getByText('Nowa')).toBeInTheDocument()
  })

  it('zapisuje notatkę własnymi słowami razem z zapoznaniem', async () => {
    renderSesja()
    await screen.findByText('Czym jest gradient?')

    await userEvent.type(screen.getByLabelText(/moimi słowami/i), 'wektor pochodnych')
    await passIntro()

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2))
    expect(calls).toEqual(
      expect.arrayContaining([
        {
          method: 'PATCH',
          url: '/api/flashcards/1',
          body: { own_note: 'wektor pochodnych' },
        },
        { method: 'POST', url: '/api/flashcards/1/intro', body: null },
      ]),
    )
  })

  it('odsłania odpowiedź spacją i pokazuje prawdziwy interwał na przycisku', async () => {
    renderSesja()
    await passIntro()

    expect(await screen.findByText('Co robi parametr k?')).toBeInTheDocument()
    expect(screen.queryByText('Tył 2')).toBeNull()

    await userEvent.keyboard(' ')

    expect(await screen.findByText('Tył 2')).toBeInTheDocument()
    // Karta jest w pudełku 2, więc trafienie wyśle ją do 3, czyli za 4 dni.
    expect(screen.getByText('za 4 dni · pudełko 3')).toBeInTheDocument()
    expect(screen.getByText('wraca dziś, pudełko 1')).toBeInTheDocument()
  })

  it('trafienie zapisuje powtórkę i pokazuje takt awansu pudełka', async () => {
    renderSesja()
    await passIntro()
    await screen.findByText('Co robi parametr k?')
    await userEvent.keyboard(' ')

    await userEvent.keyboard('2')

    expect(calls.filter((c) => c.url === '/api/flashcards/2/review')).toEqual([
      { method: 'POST', url: '/api/flashcards/2/review', body: { correct: true } },
    ])
    // Awans jest jedynym sygnałem postępu na karcie, więc dostaje własny takt.
    expect(await screen.findByText('Pudełko')).toBeInTheDocument()
    expect(screen.getByText('wraca za 4 dni')).toBeInTheDocument()
  })

  it('wpadka wraca w tej sesji, ale drugie podejście nie idzie do backendu', async () => {
    renderSesja()
    await passIntro()
    await screen.findByText('Co robi parametr k?')
    await userEvent.keyboard(' ')
    await userEvent.keyboard('1')

    // Karta 3, potem pytanie, potem wraca karta 2.
    await screen.findByText('Przód 3')
    await userEvent.keyboard(' ')
    await userEvent.keyboard('2')

    await screen.findByText('Dlaczego accuracy bywa myląca?', {}, { timeout: 3000 })
    await userEvent.click(
      screen.getByRole('button', { name: /rozwiązałem samodzielnie/i }),
    )
    await userEvent.click(await screen.findByRole('button', { name: /^dalej$/i }))

    expect(await screen.findByText('Co robi parametr k?')).toBeInTheDocument()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('2')

    // Odpowiedź widziałeś minutę temu — to ćwiczenie, nie powtórka.
    expect(calls.filter((c) => c.url === '/api/flashcards/2/review')).toHaveLength(1)
  })

  it('kończy rachunkiem XP liczonym stawkami backendu', async () => {
    renderSesja()
    await passIntro()

    // Obie karty na „umiałem", pytanie samodzielnie.
    for (const front of ['Co robi parametr k?', 'Przód 3']) {
      await screen.findByText(front, {}, { timeout: 3000 })
      await userEvent.keyboard(' ')
      await userEvent.keyboard('2')
    }
    await screen.findByText('Dlaczego accuracy bywa myląca?', {}, { timeout: 3000 })
    await userEvent.click(
      screen.getByRole('button', { name: /rozwiązałem samodzielnie/i }),
    )
    await userEvent.click(await screen.findByRole('button', { name: /^dalej$/i }))

    expect(await screen.findByText('Sesja zakończona')).toBeInTheDocument()
    // 2 powtórki x2 + 1 zapoznanie x3 + 1 pytanie x5 + premia x3 = 15
    expect(screen.getByLabelText('Zdobyte 15 XP')).toBeInTheDocument()
    expect(screen.getByText('2 × 2')).toBeInTheDocument()
    expect(screen.getByText('1 × 5')).toBeInTheDocument()
    // „1 × 3" pojawia się dwa razy: nowe karty i premia za samodzielność.
    expect(screen.getAllByText('1 × 3')).toHaveLength(2)
    // Wiersz notatek stoi na zero i to jest uczciwa informacja, nie błąd.
    expect(screen.getByText('Notatki')).toBeInTheDocument()
    // Karta 3 była w pudełku 4, więc trafienie doprowadziło ją do piątego.
    expect(screen.getByText('w pudełku 5')).toBeInTheDocument()
  })

  it('Esc kończy sesję w dowolnym momencie', async () => {
    renderSesja()
    await screen.findByText('Czym jest gradient?')

    await userEvent.keyboard('{Escape}')

    expect(await screen.findByText('Sesja zakończona')).toBeInTheDocument()
    // Nic nie zostało ocenione, więc nie ma za co naliczać punktów.
    expect(screen.getByText(/nie ma za co naliczyć/i)).toBeInTheDocument()
  })
})
