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
