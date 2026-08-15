import type { JournalDay } from '@/api/types'

/**
 * Składanie strumienia dni w dziennik: nagłówki miesięcy i nazwane przerwy.
 *
 * Osobno od widoku, bo to jedyna nietrywialna logika tego ekranu i jedyna,
 * którą da się pomylić po cichu — źle policzona przerwa wygląda tak samo jak
 * dobrze policzona, dopóki jej nie policzysz drugi raz.
 */

/**
 * „2026-08-15" -> Date w czasie *lokalnym*.
 *
 * `new Date("2026-08-15")` czyta datę jako północ UTC, więc na zachód od
 * Greenwich wypada dzień wcześniej. Backend liczy dni czasem lokalnym maszyny
 * (services/clock.py), więc front musi je tak samo odczytywać.
 */
export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

/** Poniedziałek = 0. `Date.getDay()` zaczyna tydzień od niedzieli. */
export function weekdayIndex(iso: string): number {
  return (parseDay(iso).getDay() + 6) % 7
}

function daysBetween(earlier: string, later: string): number {
  const span = parseDay(later).getTime() - parseDay(earlier).getTime()
  return Math.round(span / 86_400_000)
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export type FeedItem =
  | { kind: 'month'; key: string; label: string; days: number; xp: number }
  | { kind: 'gap'; key: string; days: number }
  | { kind: 'day'; key: string; entry: JournalDay }

const MONTH_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  month: 'long',
  year: 'numeric',
})

function monthLabel(iso: string): string {
  const text = MONTH_FORMAT.format(parseDay(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Dni (od najnowszego) rozdzielone nagłówkami miesięcy i znacznikami przerw.
 *
 * Przerwy liczymy tylko wewnątrz miesiąca: „4 dni przerwy" tuż pod nagłówkiem
 * następnego miesiąca mówiłoby o dziurze, która wizualnie jest już opisana
 * przez sam nagłówek.
 */
export function buildFeed(days: JournalDay[]): FeedItem[] {
  const items: FeedItem[] = []
  let month: string | null = null
  let previous: string | null = null

  for (const entry of days) {
    const key = monthKey(entry.day)
    if (key !== month) {
      month = key
      const inMonth = days.filter((other) => monthKey(other.day) === key)
      items.push({
        kind: 'month',
        key: `m-${key}`,
        label: monthLabel(entry.day),
        days: inMonth.length,
        xp: inMonth.reduce((sum, other) => sum + other.xp, 0),
      })
      previous = null
    }
    if (previous) {
      const missed = daysBetween(entry.day, previous) - 1
      if (missed > 0) {
        items.push({ kind: 'gap', key: `g-${entry.day}`, days: missed })
      }
    }
    items.push({ kind: 'day', key: entry.day, entry })
    previous = entry.day
  }

  return items
}

/**
 * Siatka kalendarza: dni chronologicznie, dopełnione z przodu pustymi polami.
 *
 * Bez dopełnienia pierwsza kolumna zaczynałaby się od przypadkowego dnia
 * tygodnia i wiersze przestałyby znaczyć „poniedziałki", „wtorki" i tak dalej.
 */
export function calendarCells(days: JournalDay[]): (JournalDay | null)[] {
  if (days.length === 0) return []
  return [...Array<null>(weekdayIndex(days[0]!.day)).fill(null), ...days]
}
