import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BackupPreview } from '@/api/types'

import { Dane } from './Dane'

const STATUS = {
  available: { flashcards: 80, questions: 31, resources: 18 },
  imported: { flashcards: 76, questions: 31, resources: 18 },
}

const SYNC = {
  flashcards_added: 4,
  questions_added: 0,
  resources_added: 0,
  answers_filled: 2,
  skipped: 125,
  warnings: ['content/questions/faza-9.md: nieznana faza 9'],
}

const PREVIEW: BackupPreview = {
  summary: {
    phases: 6,
    tasks: 48,
    flashcards: 80,
    questions: 31,
    question_attempts: 12,
    resources: 18,
    activity_log: 340,
    content_imports: 129,
    day_notes: 3,
  },
  exported_at: '2026-08-15 09:12:00',
  schema_version: 8,
  compatible: true,
  problem: null,
}

let calls: { method: string; url: string }[] = []
let preview: BackupPreview = PREVIEW

function json(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response
}

function renderDane() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dane />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function plik(name = 'kopia.json'): File {
  return new File(['{}'], name, { type: 'application/json' })
}

beforeEach(() => {
  calls = []
  preview = PREVIEW
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method !== 'GET') calls.push({ method, url })
      if (url.endsWith('/api/content/status')) return json(STATUS)
      if (url.endsWith('/api/content/sync')) return json(SYNC)
      if (url.endsWith('/api/backup/preview')) return json(preview)
      if (url.endsWith('/api/backup/import')) {
        return json({
          summary: preview.summary,
          backup_path: '/data/roadmap.db.bak-2026-08-15-193000',
        })
      }
      return json({})
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('Dane — treść z content/', () => {
  it('pokazuje, ile pozycji czeka w plikach na wczytanie', async () => {
    renderDane()

    expect(await screen.findByText('Fiszki')).toBeInTheDocument()
    expect(screen.getByText('80 w plikach')).toBeInTheDocument()
    expect(screen.getByText('4 do wczytania')).toBeInTheDocument()
    expect(screen.getByText('31 wczytanych')).toBeInTheDocument()
  })

  it('doczytanie raportuje, co weszło, i nie ukrywa ostrzeżeń', async () => {
    renderDane()
    await screen.findByText('Fiszki')

    await userEvent.click(screen.getByRole('button', { name: /doczytaj z content/i }))

    expect(
      await screen.findByText('4 fiszek · 2 uzupełnionych odpowiedzi'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('125 pozycji pominiętych — były już w bazie.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('content/questions/faza-9.md: nieznana faza 9'),
    ).toBeInTheDocument()
    expect(calls).toEqual([{ method: 'POST', url: '/api/content/sync' }])
  })
})

describe('Dane — kopia zapasowa', () => {
  it('wybranie pliku pokazuje podgląd, a nie nadpisuje bazy', async () => {
    renderDane()
    await screen.findByText('Fiszki')

    await userEvent.upload(screen.getByLabelText('Plik kopii zapasowej'), plik())

    expect(await screen.findByText('Co jest w tym pliku')).toBeInTheDocument()
    expect(screen.getByText('Dziennik zdarzeń')).toBeInTheDocument()
    expect(screen.getByText('340')).toBeInTheDocument()
    expect(screen.getByText(/schemat 8/)).toBeInTheDocument()
    // Podgląd to podgląd: do bazy nic jeszcze nie poszło.
    expect(calls).toEqual([{ method: 'POST', url: '/api/backup/preview' }])
  })

  it('nadpisanie idzie dopiero po osobnym potwierdzeniu i mówi, gdzie leży kopia', async () => {
    renderDane()
    await screen.findByText('Fiszki')
    await userEvent.upload(screen.getByLabelText('Plik kopii zapasowej'), plik())
    await screen.findByText('Co jest w tym pliku')

    await userEvent.click(
      screen.getByRole('button', { name: /skasuj obecną bazę i wczytaj tę kopię/i }),
    )

    expect(await screen.findByText('Baza wczytana z pliku.')).toBeInTheDocument()
    expect(screen.getByText(/roadmap\.db\.bak-2026-08-15-193000/)).toBeInTheDocument()
    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'POST', url: '/api/backup/preview' },
        { method: 'POST', url: '/api/backup/import' },
      ]),
    )
  })

  it('niezgodny plik pokazuje powód zamiast przycisku nadpisania', async () => {
    preview = {
      ...PREVIEW,
      compatible: false,
      problem: 'Plik pochodzi z nowszej wersji bazy (schema 9 > 8).',
    }
    renderDane()
    await screen.findByText('Fiszki')

    await userEvent.upload(screen.getByLabelText('Plik kopii zapasowej'), plik())

    expect(
      await screen.findByText('Plik pochodzi z nowszej wersji bazy (schema 9 > 8).'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /skasuj obecną bazę/i })).toBeNull()
  })
})
