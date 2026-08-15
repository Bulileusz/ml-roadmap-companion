import type { Resource } from '@/api/types'

/** Słownik i reguły materiałów do nauki — osobno od widoku, jak `leitner.ts`. */

export type Status = Resource['status']

export const STATUSES: Status[] = ['todo', 'in_progress', 'done']

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'do zrobienia',
  in_progress: 'w trakcie',
  done: 'przerobione',
}

// Te same trzy znaki co na liście zadań w Mapie: na gęstej liście czyta się je
// szybciej niż kwadraciki, a wciąż da się w nie kliknąć.
export const STATUS_MARK: Record<Status, string> = {
  todo: '·',
  in_progress: '▸',
  done: '✓',
}

// Rodzaj materiału nie ma CHECK-a w bazie (repository/resources_repo.py), więc
// nieznana wartość ma zdegradować się do etykiety domyślnej, a nie wywalić widok.
const KIND_LABEL: Record<string, string> = {
  book: 'Książka',
  course: 'Kurs',
  video: 'Wideo',
  docs: 'Dokumentacja',
  article: 'Artykuł',
  other: 'Materiał',
}

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? KIND_LABEL.other!
}

/** Kolejny stan w cyklu — kliknięcie w znaczek przesuwa materiał do przodu. */
export function nextStatus(status: Status): Status {
  return STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length]!
}

/** „docs.python.org" — domena wystarcza, pełny URL rozpycha wiersz. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
