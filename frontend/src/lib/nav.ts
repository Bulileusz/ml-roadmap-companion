export type NavItem = {
  to: string
  label: string
  /** Drugi klawisz akordu „g …", wybrany od nazwy strony po polsku. */
  chord: string
}

/**
 * Nawigacja i skróty „g …" w jednym miejscu.
 *
 * Bez ikon: w tym motywie szyna nawigacji ma 96 px i jest wyłącznie
 * typograficzna — ikona obok czteroliterowego słowa dokłada szumu, nie
 * informacji. Sesja nie ma tu pozycji, bo nie jest miejscem, tylko trybem:
 * wchodzi się w nią ze strony „Dziś" albo klawiszem `s`.
 */
export const NAV: NavItem[] = [
  { to: '/', label: 'Dziś', chord: 'd' },
  { to: '/mapa', label: 'Mapa', chord: 'm' },
  { to: '/fiszki', label: 'Fiszki', chord: 'f' },
  { to: '/pytania', label: 'Pytania', chord: 'p' },
  { to: '/zasoby', label: 'Zasoby', chord: 'z' },
  { to: '/dziennik', label: 'Dziennik', chord: 'j' },
  { to: '/dane', label: 'Dane', chord: 'b' },
]
