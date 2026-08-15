/**
 * Lustro harmonogramu Leitnera z backendu — wyłącznie po to, żeby podpisać
 * przyciski oceny, ZANIM użytkownik kliknie.
 *
 * Autorytatywny jest backend: `services/spaced_repetition.py` liczy pudełko
 * i termin, a odpowiedź `POST /review` zwraca kartę po zmianie. Ta tabela
 * przewiduje tylko, co się stanie, żeby dało się napisać „za 7 dni · pudełko 4"
 * na przycisku. Rozjazd z backendem byłby błędem, więc pilnuje go test
 * porównujący te wartości z tymi, które są udokumentowane po stronie Pythona.
 */

export const MIN_BOX = 1
export const MAX_BOX = 5

/** `BOX_INTERVALS_DAYS` z services/spaced_repetition.py. */
export const BOX_INTERVALS_DAYS: Readonly<Record<number, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
}

/** `next_box()` z backendu: trafienie awansuje o jedno, wpadka cofa do pierwszego. */
export function nextBox(box: number, correct: boolean): number {
  if (!correct) return MIN_BOX
  return Math.min(box + 1, MAX_BOX)
}

export function intervalDays(box: number): number {
  return BOX_INTERVALS_DAYS[Math.min(Math.max(box, MIN_BOX), MAX_BOX)] ?? 1
}

/** „jutro" / „za 4 dni" — jeden dzień ma własne słowo, bo „za 1 dzień" brzmi jak robot. */
export function whenLabel(days: number): string {
  return days === 1 ? 'jutro' : `za ${days} dni`
}

/** Podpis pod przyciskiem „Umiałem": dokąd karta pojedzie i na jak długo. */
export function promotionLabel(box: number): string {
  const target = nextBox(box, true)
  return `${whenLabel(intervalDays(target))} · pudełko ${target}`
}

/**
 * Termin powtórki po ludzku: „dziś", „jutro", „za 4 dni", „zaległa o 3 dni".
 *
 * Zaległość ma własne słowo, bo „za -3 dni" jest bez sensu, a karta po
 * terminie to inna informacja niż karta zaplanowana. Obie daty jako
 * „RRRR-MM-DD" — porównujemy dni, nie momenty, więc strefa nie ma tu wpływu.
 */
export function dueLabel(nextReviewAt: string, today: string): string {
  const days = Math.round(
    (Date.parse(`${nextReviewAt}T00:00:00`) - Date.parse(`${today}T00:00:00`)) /
      86_400_000,
  )
  if (Number.isNaN(days)) return nextReviewAt
  if (days < 0) return `zaległa o ${-days} ${-days === 1 ? 'dzień' : 'dni'}`
  if (days === 0) return 'dziś'
  return whenLabel(days)
}

/** Dzisiejsza data w formacie bazy. Osobno, żeby dało się ją wstrzyknąć w teście. */
export function todayISO(now: Date = new Date()): string {
  // Lokalnie, nie przez toISOString(): baza liczy „dziś" czasem maszyny
  // (services/clock.py), a UTC potrafi przesunąć dzień o jeden.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
