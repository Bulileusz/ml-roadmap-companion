import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Achievement } from '@/api/types'
import { readSeen } from '@/lib/achievements'

import { Dorobek } from './Dorobek'

function odznaka(id: string, label: string, unlocked: boolean): Achievement {
  return { id, label, hint: `Podpowiedź do ${label}.`, icon: 'Flame', unlocked }
}

const ODZNAKI: Achievement[] = [
  odznaka('streak-7', '7 dni z rzędu', true),
  odznaka('reviews-100', '100 powtórek', true),
  odznaka('phase-0', 'Faza 0 domknięta', true),
  odznaka('streak-30', '30 dni z rzędu', false),
  odznaka('reviews-500', '500 powtórek', false),
]

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderDorobek() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Dorobek />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/api/achievements')) return json(ODZNAKI)
      return json({})
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Dorobek', () => {
  it('pokazuje zdobyte i liczy je przy nagłówku', async () => {
    renderDorobek()

    expect(await screen.findByText('7 dni z rzędu')).toBeInTheDocument()
    expect(screen.getByText('100 powtórek')).toBeInTheDocument()
    expect(screen.getByText('3 z 5')).toBeInTheDocument()
  })

  it('niezdobyte są schowane, dopóki się o nie nie poprosi', async () => {
    renderDorobek()
    await screen.findByText('7 dni z rzędu')

    expect(screen.queryByText('30 dni z rzędu')).toBeNull()

    await userEvent.click(
      screen.getByRole('button', { name: 'Pokaż też 2 niezdobytych' }),
    )

    expect(screen.getByText('30 dni z rzędu')).toBeInTheDocument()
    // Niezdobyte niosą podpowiedź — to ona mówi, po co warto wrócić.
    expect(screen.getByText('Podpowiedź do 30 dni z rzędu.')).toBeInTheDocument()
  })

  it('przy zdobytym nie powtarza już nieaktualnej instrukcji', async () => {
    renderDorobek()
    await screen.findByText('7 dni z rzędu')

    expect(screen.queryByText('Podpowiedź do 7 dni z rzędu.')).toBeNull()
  })

  it('obejrzenie listy zapisuje zdobyte jako widziane', async () => {
    renderDorobek()
    await screen.findByText('7 dni z rzędu')

    // Dzięki temu po najbliższej sesji nie błyśnie czymś, co już przeczytałeś.
    expect(readSeen()).toEqual(['streak-7', 'reviews-100', 'phase-0'])
  })

  it('pusty dorobek mówi, jak zacząć, zamiast pokazywać nic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(ODZNAKI.map((item) => ({ ...item, unlocked: false })))),
    )
    renderDorobek()

    expect(await screen.findByText(/Jeszcze nic zdobytego/)).toBeInTheDocument()
    expect(screen.getByText('0 z 5')).toBeInTheDocument()
  })
})
