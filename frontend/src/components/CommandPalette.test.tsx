import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Flashcard } from '@/api/types'

import { CommandPalette } from './CommandPalette'

function card(id: number, front: string): Flashcard {
  return {
    id,
    phase_id: 1,
    front,
    back: 'Tył',
    box: 2,
    next_review_at: '2026-08-15',
    learned_at: '2026-08-01 10:00:00',
    own_note: '',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-01 10:00:00',
  }
}

const FISZKI = [card(1, 'Czym jest gradient?'), card(2, 'Lasy losowe — po co?')]

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

/** Podgląd adresu, żeby dało się sprawdzić, dokąd paleta faktycznie prowadzi. */
function Adres() {
  const location = useLocation()
  return <span data-testid="adres">{location.pathname + location.search}</span>
}

const onShowHelp = vi.fn()

function renderPalette() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <CommandPalette open onOpenChange={() => {}} onShowHelp={onShowHelp} />
        <Routes>
          <Route path="*" element={<Adres />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  onShowHelp.mockClear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/api/flashcards')) return json(FISZKI)
      return json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('Paleta poleceń', () => {
  it('startuje od nawigacji i akcji, bez sypania treścią', async () => {
    renderPalette()

    expect(await screen.findByRole('option', { name: /Dziennik/ })).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /Zacznij sesję dnia/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /gradient/ })).toBeNull()
  })

  it('pokazuje skrót obok pozycji — uczy klawiatury, nie zastępuje jej', async () => {
    renderPalette()

    const pozycja = await screen.findByRole('option', { name: /Mapa/ })
    expect(pozycja).toHaveTextContent('g')
    expect(pozycja).toHaveTextContent('m')
  })

  it('szuka fiszek dopiero po wpisaniu zapytania i prowadzi do biblioteki', async () => {
    renderPalette()
    await screen.findByRole('option', { name: /Dziennik/ })

    await userEvent.type(screen.getByRole('combobox'), 'gradient')
    await userEvent.click(
      await screen.findByRole('option', { name: /Czym jest gradient/ }),
    )

    // Zapytanie jedzie razem z id, żeby karta wylądowała na górze listy.
    await waitFor(() =>
      expect(screen.getByTestId('adres')).toHaveTextContent(
        '/fiszki?q=gradient&karta=1',
      ),
    )
  })

  it('strzałki i Enter wystarczą do wybrania pozycji', async () => {
    renderPalette()
    await screen.findByRole('option', { name: /Dziś/ })

    const pole = screen.getByRole('combobox')
    // Pierwsza pozycja jest wybrana od startu, więc jedna strzałka w dół
    // przesuwa na drugą — „Mapa".
    await userEvent.type(pole, '{ArrowDown}{Enter}')

    await waitFor(() => expect(screen.getByTestId('adres')).toHaveTextContent('/mapa'))
  })

  it('strzałka w górę z pierwszej pozycji zawija na koniec listy', async () => {
    renderPalette()
    await screen.findByRole('option', { name: /Dziś/ })

    // Ostatnia pozycja pełnej listy to „Skróty klawiszowe" — akcja, nie
    // przejście, więc widać przy okazji, że paleta obsługuje oba rodzaje.
    await userEvent.type(screen.getByRole('combobox'), '{ArrowUp}{Enter}')

    expect(onShowHelp).toHaveBeenCalledTimes(1)
  })

  it('nietrafione zapytanie mówi, co zrobić, zamiast pokazywać pustkę', async () => {
    renderPalette()
    await screen.findByRole('option', { name: /Dziś/ })

    await userEvent.type(screen.getByRole('combobox'), 'transformery')

    expect(screen.getByText(/Nic nie pasuje/)).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('wybrana pozycja jest oznaczona dla czytnika ekranu', async () => {
    renderPalette()

    const pierwsza = await screen.findByRole('option', { name: /Dziś/ })
    expect(pierwsza).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      pierwsza.id,
    )
  })
})
