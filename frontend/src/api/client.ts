/**
 * Cienki klient HTTP. Bez biblioteki - API jest własne, lokalne i małe.
 *
 * Jedna rzecz, którą warto tu mieć porządnie zrobioną, to komunikat błędu:
 * FastAPI zwraca `detail` jako string przy 4xx z HTTPException i jako listę
 * obiektów przy 422 z walidacji Pydantica. Bez rozpakowania tej listy
 * użytkownik zobaczyłby „[object Object]" zamiast „tytuł nie może być pusty".
 */

export class ApiError extends Error {
  // Pole przypisane w ciele konstruktora, nie skrótem `constructor(readonly …)`:
  // parametry-właściwości to składnia, która musi zostać przepisana, a projekt
  // stoi na `erasableSyntaxOnly` - TypeScript ma być wyłącznie do usunięcia,
  // bo transpiluje go Vite jednym przejściem esbuilda, bez emitera TS-a.
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ValidationDetail = { loc?: (string | number)[]; msg?: string }

function readDetail(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const messages = (detail as ValidationDetail[])
        .map((item) => {
          // loc to np. ["body", "title"] - interesuje nas ostatni człon,
          // czyli nazwa pola, bo "body" nic użytkownikowi nie mówi.
          const field = item.loc?.at(-1)
          return field && field !== 'body' ? `${field}: ${item.msg}` : item.msg
        })
        .filter(Boolean)
      if (messages.length) return messages.join('; ')
    }
  }
  return `Błąd ${status}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    // Najczęstszy przypadek na localhoście: backend nie chodzi. Domyślne
    // „Failed to fetch" nie mówi, co z tym zrobić.
    throw new ApiError(0, 'Brak połączenia z backendem - czy uvicorn działa?')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(response.status, readDetail(payload, response.status))
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Nazwa pliku z Content-Disposition; bez niej przeglądarka zapisze „export". */
function filenameFrom(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^"]+)"?/)
  return match?.[1] ?? fallback
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    // Bez Content-Type: przeglądarka musi sama dorobić boundary multiparta.
    return request<T>(path, { method: 'POST', body: form })
  },

  /**
   * Pobranie pliku z odpowiedzi, nie z linku.
   *
   * `<a href="/api/backup/export" download>` wyglądałoby prościej, ale przy
   * błędzie serwera przeglądarka zapisałaby na dysk stronę błędu pod nazwą
   * kopii zapasowej. Przez fetch błąd jest błędem i widać go w interfejsie.
   */
  download: async (path: string, fallbackName: string) => {
    const response = await fetch(path)
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new ApiError(response.status, readDetail(payload, response.status))
    }
    const blob = await response.blob()
    const name = filenameFrom(response.headers.get('Content-Disposition'), fallbackName)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    // Zwolnienie w mikrozadaniu: kliknięcie jest synchroniczne, ale samo
    // pobieranie startuje po nim — natychmiastowe revoke potrafi je uciąć.
    setTimeout(() => URL.revokeObjectURL(url), 0)
    return name
  },
}
