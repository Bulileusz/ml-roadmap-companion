import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Dashboard as DashboardData,
  PhaseProgress,
  SessionPlan,
  Task,
} from '@/api/types'
import { AppShell } from '@/components/AppShell'
import { HotkeysProvider } from '@/lib/hotkeys'

import { Dashboard } from './Dashboard'

/* Test dymny całego drzewa strony startowej: shell, karta sesji, kafelki
 * wskaźników, pierścienie i karty faz w jednym renderze. Bez niego literówka
 * w propsie albo puste `data` wychodziłyby dopiero przy ręcznym otwarciu apki -
 * dokładnie ta klasa błędów, którą w wersji streamlitowej łapał AppTest. */

const DASHBOARD: DashboardData = {
  roadmap: { done: 7, total: 26, pct: 26.9 },
  due_count: 13,
  intro_count: 5,
  independence: { independent: 38, total: 49, pct: 77.5 },
  boxes: [
    { box: 1, count: 40 },
    { box: 2, count: 12 },
    { box: 3, count: 6 },
    { box: 4, count: 2 },
    { box: 5, count: 1 },
  ],
  cards_total: 61,
  next_task: {
    id: 3,
    phase_id: 1,
    title: 'Granice decyzyjne — porównanie KNN i drzewa',
    phase_name: 'Faza 2 - Klasyczne ML od zera',
  },
  streak: { current: 7, longest: 12, active_days: 20 },
  progression: {
    xp: 300,
    level: 3,
    xp_into_level: 100,
    xp_for_next_level: 250,
    pct: 40,
  },
}

const PHASES: PhaseProgress[] = [
  {
    phase: { id: 1, code: '0', name: 'Faza 0 - Python odświeżenie', order_index: 0 },
    done: 4,
    total: 4,
    pct: 100,
  },
  {
    phase: { id: 2, code: '2', name: 'Faza 2 - Klasyczne ML od zera', order_index: 1 },
    done: 3,
    total: 6,
    pct: 50,
  },
]

const TASKS: Task[] = [
  {
    id: 10,
    phase_id: 2,
    title: 'KNN i rola parametru k',
    notes: '',
    is_done: true,
    order_index: 0,
  },
  {
    id: 11,
    phase_id: 2,
    title: 'Regresja logistyczna',
    notes: '',
    is_done: false,
    order_index: 1,
  },
]

const SESSION: SessionPlan = {
  intro: [],
  reviews: [],
  reviews_remaining: 0,
  questions: [],
  phase: PHASES[1]!.phase,
  next_task: DASHBOARD.next_task,
  total_steps: 8,
  estimated_minutes: 8,
}

/* Stan serwera trzymany w teście, nie stała tablica: PATCH musi zmienić to, co
 * zwróci kolejny GET. Stub, który po zapisie oddaje stare dane, wyglądałby jak
 * błąd optymistycznej podmiany, a jest tylko kłamstwem atrapy. */
let tasksState: Task[] = []
const patched: { url: string; body: unknown }[] = []
/* Zatrzask na odpowiedzi PATCH-a - pozwala sprawdzić, co widać, *zanim* serwer
 * odpowie. To jedyny sposób, żeby udowodnić, że podmiana jest optymistyczna,
 * a nie po prostu szybka. */
let releasePatch: () => void = () => {}
const patchPending = () => new Promise<void>((resolve) => (releasePatch = resolve))
let gate: Promise<void>

function stubFetch() {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { is_done?: boolean }
      patched.push({ url, body })
      await gate
      const id = Number(url.split('/').pop())
      tasksState = tasksState.map((task) =>
        task.id === id ? { ...task, is_done: body.is_done ?? task.is_done } : task,
      )
      return json(tasksState.find((task) => task.id === id))
    }
    if (url.endsWith('/api/dashboard')) return json(DASHBOARD)
    if (url.endsWith('/api/phases')) return json(PHASES)
    if (url.endsWith('/api/session/today')) return json(SESSION)
    if (url.includes('/tasks')) return json(tasksState)
    if (url.endsWith('/api/achievements')) return json([])
    throw new Error(`Nieoczekiwane zapytanie w teście: ${url}`)
  })
}

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <HotkeysProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="session" element={<p>ekran sesji</p>} />
            </Route>
          </Routes>
        </HotkeysProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  patched.length = 0
  tasksState = TASKS.map((task) => ({ ...task }))
  gate = patchPending()
  vi.stubGlobal('fetch', stubFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Dashboard', () => {
  it('pokazuje plan dnia, wskaźniki i fazy', async () => {
    renderDashboard()

    expect(await screen.findByText('Dzisiejsza sesja')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zacznij sesję/i })).toBeInTheDocument()

    // Wskaźniki: procenty i liczniki, każdy z własnym podpisem.
    expect(screen.getByText('Postęp roadmapy')).toBeInTheDocument()
    expect(screen.getByText('7 z 26 zadań')).toBeInTheDocument()
    expect(screen.getByText('Do poznania')).toBeInTheDocument()
    expect(screen.getByText('38 z 49 podejść')).toBeInTheDocument()

    // Odmiana przez liczebnik idzie z Intl.PluralRules, nie z ręcznych warunków.
    expect(screen.getByText('61 fiszek w rotacji')).toBeInTheDocument()

    // Poziom i seria z dorobku liczonego po stronie backendu.
    expect(screen.getByText(/Poziom/)).toBeInTheDocument()
    expect(screen.getByText(/rekord: 12/)).toBeInTheDocument()

    // Fazy: nazwa bez powtórzonego numeru, bo numer jest w badge'u obok.
    expect(screen.getByText('Python odświeżenie')).toBeInTheDocument()
    // Nazwa fazy pojawia się dwa razy: w karcie sesji i na liście faz.
    expect(screen.getAllByText('Klasyczne ML od zera').length).toBeGreaterThan(0)
    expect(screen.getByText('domknięta')).toBeInTheDocument()
  })

  it('rozwija bieżącą fazę od wejścia i pokazuje jej zadania', async () => {
    renderDashboard()

    // Faza 0 jest domknięta, więc rozwinięta ma być faza 2 - ta, w której
    // faktycznie jesteś. Szukanie jej klikaniem byłoby pracą za darmo.
    expect(await screen.findByText('KNN i rola parametru k')).toBeInTheDocument()
    expect(screen.getByText('Regresja logistyczna')).toBeInTheDocument()
  })

  it('odhaczenie zadania wysyła PATCH i od razu zmienia widok', async () => {
    renderDashboard()
    const task = await screen.findByText('Regresja logistyczna')

    // Klikamy etykietę, tak jak użytkownik. Kliknięcie samego <input> wewnątrz
    // <label> jsdom przekazuje dalej do kontrolki i przełącznik strzela dwa razy.
    await userEvent.click(task)

    // Przekreślenie pojawia się, zanim serwer odpowie - PATCH wisi na zatrzasku.
    // To cała różnica wobec Streamlita, który przeliczał całą stronę po każdym
    // kliknięciu checkboxa.
    await waitFor(() => expect(task).toHaveClass('line-through'))
    expect(patched).toEqual([{ url: '/api/tasks/11', body: { is_done: true } }])

    releasePatch()

    // A po odpowiedzi i odświeżeniu listy stan się nie cofa.
    await waitFor(() => expect(task).toHaveClass('line-through'))
  })

  it('skrót g s prowadzi na ekran sesji', async () => {
    renderDashboard()
    await screen.findByText('Dzisiejsza sesja')

    await userEvent.keyboard('gs')

    expect(await screen.findByText('ekran sesji')).toBeInTheDocument()
  })

  it('przycisk zacznij sesję prowadzi tam samo', async () => {
    renderDashboard()

    await userEvent.click(await screen.findByRole('button', { name: /zacznij sesję/i }))

    expect(await screen.findByText('ekran sesji')).toBeInTheDocument()
  })
})
