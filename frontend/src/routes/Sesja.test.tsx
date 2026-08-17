import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Flashcard, QuestionWithStats, SessionPlan } from '@/api/types'
import { HotkeysProvider } from '@/lib/hotkeys'

import { Sesja } from './Sesja'

// canvas-confetti rysuje po <canvas>, którego jsdom nie implementuje.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

/* Test przebiegu sesji od pierwszej karty do rachunku XP. To jedyne miejsce,
 * w którym widać razem maszynę stanu, wywołania API i ekrany — a większość
 * błędów tego PR-a mieszkałaby właśnie na tych stykach.
 *
 * Kolejka: powtórka 2 → powtórka 3 → zapoznanie 1 → pytanie 9. */

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
  questions_gate: null,
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
      stats: { independent: 2, total: 3, pct: 66.67 },
    } satisfies QuestionWithStats,
  ],
  phase: { id: 1, code: '2', name: 'Faza 2 - Klasyczne ML od zera', order_index: 2 },
  // Bez odprawy: ten opis sprawdza kolejność powtórek, zapoznań i pytań, więc
  // brief przed nimi przesunąłby każdy krok i wysadził liczniki. Odprawa ma
  // własny describe niżej.
  briefing: null,
  next_task: {
    id: 7,
    phase_id: 1,
    title: 'Granice decyzyjne',
    phase_name: 'Faza 2 - Klasyczne ML od zera',
    notes: 'Porównaj KNN, LogReg, drzewo i SVM.',
  },
  total_steps: 4,
  estimated_minutes: 4,
}

let calls: { method: string; url: string; body: unknown }[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function stubFetch(planPayload: SessionPlan = PLAN) {
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
    if (url.endsWith('/api/session/today')) return json(planPayload)
    if (url.includes('/review') || url.includes('/intro')) return json(card(2))
    if (url.includes('/attempts')) return json({ independent: 3, total: 4, pct: 75 })
    if (url.includes('/defer')) return json(null)
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

/** Odsłania i ocenia bieżącą powtórkę. Po trafieniu leci takt awansu. */
async function gradeCard(correct: boolean) {
  await userEvent.keyboard(' ')
  await userEvent.keyboard(correct ? '2' : '1')
}

/** Przechodzi obie powtórki na „umiałem", żeby dojść do zapoznania. */
async function passReviews() {
  for (const front of ['Co robi parametr k?', 'Przód 3']) {
    await screen.findByText(front, {}, { timeout: 3000 })
    await gradeCard(true)
  }
}

/** Zapoznanie i pytanie — reszta drogi do podsumowania. */
async function passIntro() {
  await screen.findByText('Czym jest gradient?', {}, { timeout: 3000 })
  await userEvent.click(screen.getByRole('button', { name: /rozumiem, dalej/i }))
}

beforeEach(() => {
  calls = []
  vi.stubGlobal('fetch', stubFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Sesja', () => {
  it('zaczyna od powtórki, bo ta ma termin', async () => {
    renderSesja()

    // Zapoznania są uznaniowe — gdy urwiesz sesję w połowie, ma być zrobione
    // to, co na dziś przypadało.
    expect(await screen.findByText('Co robi parametr k?')).toBeInTheDocument()
    expect(screen.queryByText('Czym jest gradient?')).toBeNull()
    expect(screen.getByText('Pudełko 2')).toBeInTheDocument()
  })

  it('odsłania odpowiedź spacją i pokazuje prawdziwy interwał na przycisku', async () => {
    renderSesja()
    await screen.findByText('Co robi parametr k?')
    expect(screen.queryByText('Tył 2')).toBeNull()

    await userEvent.keyboard(' ')

    expect(await screen.findByText('Tył 2')).toBeInTheDocument()
    // Karta jest w pudełku 2, więc trafienie wyśle ją do 3, czyli za 4 dni.
    expect(screen.getByText('za 4 dni · pudełko 3')).toBeInTheDocument()
    expect(screen.getByText('wraca dziś, pudełko 1')).toBeInTheDocument()
  })

  it('trafienie zapisuje powtórkę i pokazuje takt awansu pudełka', async () => {
    renderSesja()
    await screen.findByText('Co robi parametr k?')

    await gradeCard(true)

    expect(calls.filter((c) => c.url === '/api/flashcards/2/review')).toEqual([
      { method: 'POST', url: '/api/flashcards/2/review', body: { correct: true } },
    ])
    // Awans jest jedynym sygnałem postępu na karcie, więc dostaje własny takt.
    expect(await screen.findByText('Pudełko')).toBeInTheDocument()
    expect(screen.getByText('wraca za 4 dni')).toBeInTheDocument()
  })

  it('zapoznanie przychodzi po powtórkach, bez oceniania i z jawną ceną', async () => {
    renderSesja()
    await passReviews()

    expect(
      await screen.findByText('Czym jest gradient?', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/bez oceniania/i)).toBeInTheDocument()
    // Pierwszy kontakt z materiałem nie jest testem — nie ma czego oceniać.
    expect(screen.queryByRole('button', { name: /nie umiałem/i })).toBeNull()
    // Stopka mówi, co zrobi przycisk, zanim go naciśniesz.
    expect(
      screen.getByText('Wejdzie do pudełka 1 · powtórka jutro'),
    ).toBeInTheDocument()
    expect(screen.getByText('+3 XP')).toBeInTheDocument()
    expect(screen.getByText('nowa karta 1 z 1')).toBeInTheDocument()
  })

  it('zapisuje notatkę własnymi słowami razem z zapoznaniem', async () => {
    renderSesja()
    await passReviews()
    await screen.findByText('Czym jest gradient?', {}, { timeout: 3000 })

    await userEvent.type(screen.getByLabelText(/moimi słowami/i), 'wektor pochodnych')
    await userEvent.click(screen.getByRole('button', { name: /rozumiem, dalej/i }))

    await waitFor(() =>
      expect(calls).toEqual(
        expect.arrayContaining([
          {
            method: 'PATCH',
            url: '/api/flashcards/1',
            body: { own_note: 'wektor pochodnych' },
          },
          { method: 'POST', url: '/api/flashcards/1/intro', body: null },
        ]),
      ),
    )
  })

  it('krok pytań pokazuje historię samodzielności przed odpowiedzią', async () => {
    renderSesja()
    await passReviews()
    await passIntro()

    expect(
      await screen.findByText('Dlaczego accuracy bywa myląca?'),
    ).toBeInTheDocument()
    // Ta liczba mówi, czy to pytanie regularnie Cię przewraca.
    expect(screen.getByText('samodzielnie 2 z 3')).toBeInTheDocument()
    expect(screen.getByText('Koncept')).toBeInTheDocument()
    expect(screen.getByText('Pytanie 1 / 1')).toBeInTheDocument()
    // Odpowiedź jest zakryta, dopóki nie zadeklarujesz, jak poszło.
    expect(screen.queryByText(/Przy rzadkiej klasie/)).toBeNull()
  })

  it('odpowiedź samodzielna przelicza wskaźnik i odsłania wzorzec', async () => {
    renderSesja()
    await passReviews()
    await passIntro()
    await screen.findByText('Dlaczego accuracy bywa myląca?')

    await userEvent.click(
      screen.getByRole('button', { name: /rozwiązałem samodzielnie/i }),
    )

    expect(calls).toEqual(
      expect.arrayContaining([
        {
          method: 'POST',
          url: '/api/questions/9/attempts',
          body: { solved_independently: true },
        },
      ]),
    )
    // 2 z 3 plus to podejście = 3 z 4, czyli 75%.
    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(screen.getByText('samodzielnie 3 z 4')).toBeInTheDocument()
    expect(screen.getByText('+8 XP')).toBeInTheDocument()
    expect(screen.getByText(/Przy rzadkiej klasie/)).toBeInTheDocument()
  })

  it('wpadka wraca w tej sesji, ale drugie podejście nie idzie do backendu', async () => {
    renderSesja()
    await screen.findByText('Co robi parametr k?')
    await gradeCard(false)

    // Kolejka: powtórka 3, zapoznanie, pytanie, potem wraca powtórka 2.
    await screen.findByText('Przód 3')
    await gradeCard(true)
    await passIntro()
    await screen.findByText('Dlaczego accuracy bywa myląca?')
    await userEvent.click(screen.getByRole('button', { name: /musiałem sprawdzić/i }))
    await userEvent.click(await screen.findByRole('button', { name: /zamknij sesję/i }))

    expect(await screen.findByText('Co robi parametr k?')).toBeInTheDocument()
    await gradeCard(true)

    // Odpowiedź widziałeś minutę temu — to ćwiczenie, nie powtórka.
    expect(calls.filter((c) => c.url === '/api/flashcards/2/review')).toHaveLength(1)
  })

  it('kończy rachunkiem XP liczonym stawkami backendu', async () => {
    renderSesja()
    await passReviews()
    await passIntro()
    await screen.findByText('Dlaczego accuracy bywa myląca?')
    await userEvent.click(
      screen.getByRole('button', { name: /rozwiązałem samodzielnie/i }),
    )
    await userEvent.click(await screen.findByRole('button', { name: /zamknij sesję/i }))

    expect(await screen.findByText('Sesja zakończona')).toBeInTheDocument()
    // 2 powtórki x2 + 1 zapoznanie x3 + 1 pytanie x5 + premia x3 = 15
    expect(screen.getByLabelText('Zdobyte 15 XP')).toBeInTheDocument()
    expect(screen.getByText('2 × 2')).toBeInTheDocument()
    expect(screen.getByText('1 × 5')).toBeInTheDocument()
    // „1 × 3" pojawia się dwa razy: nowe karty i premia za samodzielność.
    expect(screen.getAllByText('1 × 3')).toHaveLength(2)
    // Obie karty awansowały: 2→3 i 4→5.
    expect(screen.getByText('awansów pudełka')).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()
  })

  it('Esc kończy sesję w dowolnym momencie', async () => {
    renderSesja()
    await screen.findByText('Co robi parametr k?')

    await userEvent.keyboard('{Escape}')

    expect(await screen.findByText('Sesja zakończona')).toBeInTheDocument()
    // Nic nie zostało ocenione — rachunek stoi na zerach, ale wiersze zostają
    // na ekranie, bo „0 × 2" to informacja, a nie brak danych.
    expect(screen.getByText('0 × 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Zdobyte 0 XP')).toBeInTheDocument()
  })
})

describe('Odprawa', () => {
  const PLAN_Z_ODPRAWA: SessionPlan = {
    ...PLAN,
    briefing: {
      task: {
        id: 7,
        phase_id: 1,
        title: 'Granice decyzyjne',
        phase_name: 'Faza 2 - Klasyczne ML od zera',
        notes:
          'Porównaj KNN, LogReg, drzewo i SVM na jednym zbiorze.\nGotowe, gdy masz jeden wykres z czterema granicami.',
      },
      materials: [
        {
          id: 3,
          phase_id: 1,
          title: 'scikit-learn: porównanie klasyfikatorów',
          url: 'https://scikit-learn.org/stable/auto_examples/classification.html',
          kind: 'article',
          detail: '',
          status: 'todo',
          order_index: 0,
        },
      ],
      done: 2,
      total: 6,
    },
    intro: [],
    reviews: [],
    questions: [],
    total_steps: 1,
  }

  beforeEach(() => {
    calls = []
    vi.stubGlobal('fetch', stubFetch(PLAN_Z_ODPRAWA))
  })

  it('otwiera sesję zadaniem, jego opisem i materiałem', async () => {
    renderSesja()

    expect(await screen.findByText('Granice decyzyjne')).toBeInTheDocument()
    expect(screen.getByText(/Gotowe, gdy masz jeden wykres/)).toBeInTheDocument()
    expect(
      screen.getByText('scikit-learn: porównanie klasyfikatorów'),
    ).toBeInTheDocument()
    // Licznik mówi, który to punkt fazy, a stopka — że nic się tu nie odhacza.
    expect(screen.getByText('zadanie 3 z 6')).toBeInTheDocument()
    expect(screen.getByText(/Odhaczysz na Mapie/)).toBeInTheDocument()
  })

  it('nie wysyła ani jednego żądania zapisu', async () => {
    renderSesja()
    await screen.findByText('Granice decyzyjne')

    await userEvent.click(screen.getByRole('button', { name: /wiem, co robić/i }))

    // Cała umowa tego ekranu: zapowiada, nie odhacza. Zadanie roadmapy
    // zamykasz na Mapie, po faktycznej robocie.
    expect(calls).toEqual([])
  })

  it('Enter przechodzi dalej', async () => {
    renderSesja()
    await screen.findByText('Granice decyzyjne')

    await userEvent.keyboard('{Enter}')

    expect(await screen.findByText('Sesja zakończona')).toBeInTheDocument()
    expect(calls).toEqual([])
  })
})

describe('Jeszcze nie umiem', () => {
  it('odkłada pytanie, nie zapisując podejścia', async () => {
    renderSesja()
    await passReviews()
    await passIntro()
    await screen.findByText('Dlaczego accuracy bywa myląca?', {}, { timeout: 3000 })
    calls = []

    await userEvent.click(screen.getByRole('button', { name: /jeszcze nie umiem/i }))

    // Do backendu leci wyłącznie odroczenie. Podejście z „nie umiałem"
    // zaszumiłoby wskaźnik samodzielności czymś, co próbą nie było.
    expect(calls).toEqual([
      { method: 'POST', url: '/api/questions/9/defer', body: null },
    ])
    expect(calls.some((c) => c.url.includes('/attempts'))).toBe(false)
  })

  it('nie dolicza pytania do rachunku sesji', async () => {
    renderSesja()
    await passReviews()
    await passIntro()
    await screen.findByText('Dlaczego accuracy bywa myląca?', {}, { timeout: 3000 })

    await userEvent.click(screen.getByRole('button', { name: /jeszcze nie umiem/i }))

    expect(await screen.findByText('Sesja zakończona')).toBeInTheDocument()
    // Wiersz pytań stoi na zerze: odroczenie nie jest odpowiedzią.
    expect(screen.getByText('0 × 5')).toBeInTheDocument()
  })
})
