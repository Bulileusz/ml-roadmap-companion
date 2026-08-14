import {
  BookMarked,
  CalendarDays,
  Database,
  Layers,
  LayoutDashboard,
  Play,
  SquareStack,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Drugi klawisz akordu „g …", wybrany od nazwy strony po polsku. */
  chord: string
}

/**
 * Nawigacja i skróty „g …" w jednym miejscu.
 *
 * Osobny plik od AppShell, bo lista tras to dane, nie komponent - moduł
 * mieszający jedno z drugim traci Fast Refresh, a to jest plik, w którym
 * dłubie się przy każdym nowym module.
 */
export const NAV: NavItem[] = [
  { to: '/', label: 'Start', icon: LayoutDashboard, chord: 'd' },
  { to: '/session', label: 'Sesja', icon: Play, chord: 's' },
  { to: '/flashcards', label: 'Fiszki', icon: Layers, chord: 'f' },
  { to: '/questions', label: 'Pytania', icon: SquareStack, chord: 'p' },
  { to: '/resources', label: 'Zasoby', icon: BookMarked, chord: 'z' },
  { to: '/journal', label: 'Dziennik', icon: CalendarDays, chord: 'j' },
  { to: '/data', label: 'Dane', icon: Database, chord: 'b' },
]
