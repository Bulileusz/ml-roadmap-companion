import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Achievement } from '@/api/types'
import { readSeen, writeSeen } from '@/lib/achievements'

import { UnlockToast } from './UnlockToast'

const celebrate = vi.fn()
const celebrateBig = vi.fn()
vi.mock('@/lib/confetti', () => ({
  celebrate: (...args: unknown[]) => celebrate(...args),
  celebrateBig: (...args: unknown[]) => celebrateBig(...args),
}))

function odznaka(id: string, label: string, unlocked: boolean): Achievement {
  return { id, label, hint: `Zdobądź ${label}.`, icon: 'Flame', unlocked }
}

let ODZNAKI: Achievement[] = []

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderToast() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <UnlockToast />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  celebrate.mockClear()
  celebrateBig.mockClear()
  ODZNAKI = [
    odznaka('streak-7', '7 dni z rzędu', true),
    odznaka('reviews-100', '100 powtórek', true),
    odznaka('reviews-500', '500 powtórek', false),
  ]
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

describe('Błysk po zdobyciu osiągnięcia', () => {
  it('pokazuje to, co wpadło od ostatniego spojrzenia', async () => {
    writeSeen(['streak-7'])
    renderToast()

    expect(await screen.findByText('100 powtórek')).toBeInTheDocument()
    expect(screen.getByText('zdobyte przed chwilą')).toBeInTheDocument()
    // Zdobyte wcześniej i już obejrzane nie wraca na ekran.
    expect(screen.queryByText('7 dni z rzędu')).toBeNull()
    await waitFor(() => expect(celebrate).toHaveBeenCalledTimes(1))
    expect(celebrateBig).not.toHaveBeenCalled()
  })

  it('milczy, gdy nic nowego nie doszło', async () => {
    writeSeen(['streak-7', 'reviews-100'])
    renderToast()

    await waitFor(() => expect(readSeen()).toEqual(['streak-7', 'reviews-100']))
    expect(screen.queryByRole('status')).toBeNull()
    expect(celebrate).not.toHaveBeenCalled()
  })

  it('przy pierwszym uruchomieniu zasiewa pamięć, zamiast sypać wszystkim naraz', async () => {
    renderToast()

    // Pamięci nie było, więc nie ma z czym porównywać — ale od teraz jest.
    await waitFor(() => expect(readSeen()).toEqual(['streak-7', 'reviews-100']))
    expect(screen.queryByRole('status')).toBeNull()
    expect(celebrate).not.toHaveBeenCalled()
  })

  it('domknięta faza dostaje większą celebrację niż setna powtórka', async () => {
    writeSeen([])
    // Faza domyka się odhaczeniem zadania na Mapie, a nie w sesji — dlatego ten
    // komponent siedzi w powłoce i łapie to niezależnie od ekranu.
    ODZNAKI = [odznaka('phase-2b', 'Faza 2b domknięta', true)]
    renderToast()

    expect(await screen.findByText('Faza 2b domknięta')).toBeInTheDocument()
    await waitFor(() => expect(celebrateBig).toHaveBeenCalledTimes(1))
    expect(celebrate).not.toHaveBeenCalled()
  })

  it('da się schować ręcznie', async () => {
    writeSeen(['streak-7'])
    renderToast()
    await screen.findByText('100 powtórek')

    await userEvent.click(screen.getByRole('button', { name: 'Schowaj: 100 powtórek' }))

    await waitFor(() => expect(screen.queryByText('100 powtórek')).toBeNull())
  })

  it('zapisuje zobaczone, więc drugie wejście już nie błyska', async () => {
    writeSeen([])
    const first = renderToast()
    expect(await screen.findByText('100 powtórek')).toBeInTheDocument()
    first.unmount()

    renderToast()

    await waitFor(() => expect(readSeen()).toEqual(['streak-7', 'reviews-100']))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
