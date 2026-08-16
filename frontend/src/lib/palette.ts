import type { Flashcard } from '@/api/types'
import { NAV } from '@/lib/nav'
import { matches } from '@/lib/search'

/**
 * Zawartość palety poleceń — osobno od widoku, bo to jedyna nieoczywista część.
 *
 * Paleta w apce o siedmiu ekranach, która umie tylko nawigować, powtarzałaby
 * akordy „g …" innymi słowami. Sens dokłada jej dopiero szukanie w treści:
 * fiszek jest kilkadziesiąt i to one są rzeczą, do której faktycznie się wraca.
 *
 * Pytania i materiały świadomie tu nie wchodzą: ich endpointy są per faza
 * (`?phase_id=`), więc globalna szukajka po nich znaczyłaby sześć zapytań na
 * otwarcie palety. Fiszki mają jedną, całościową listę i są już w cache'u.
 */

export type Command = {
  id: string
  label: string
  hint?: string
  group: 'Nawigacja' | 'Akcje' | 'Fiszki'
  /** Dokąd iść po wybraniu. */
  to?: string
  /** Polecenie, które nie jest przejściem — obsługuje je widok. */
  act?: 'help'
  /** Skrót robiący to samo; pokazany, żeby paleta uczyła klawiatury. */
  chord?: string
}

/** Ile fiszek najwyżej trafia na listę. Paleta ma podpowiadać, nie przewijać. */
export const CARD_LIMIT = 8

export function navigationCommands(): Command[] {
  return NAV.map((item) => ({
    id: `nav:${item.to}`,
    label: item.label,
    group: 'Nawigacja',
    to: item.to,
    chord: `g ${item.chord}`,
  }))
}

export function actionCommands(): Command[] {
  return [
    {
      id: 'act:sesja',
      label: 'Zacznij sesję dnia',
      group: 'Akcje',
      to: '/sesja',
      chord: 's',
    },
    {
      id: 'act:dane',
      label: 'Doczytaj treść z content/',
      hint: 'otwiera stronę Dane',
      group: 'Akcje',
      to: '/dane',
    },
    {
      id: 'act:help',
      label: 'Skróty klawiszowe',
      group: 'Akcje',
      act: 'help',
      chord: '?',
    },
  ]
}

/**
 * Fiszki pasujące do zapytania — wyłącznie przy niepustym zapytaniu.
 *
 * Pusta paleta pokazuje nawigację i akcje, nie siedemdziesiąt fiszek: lista,
 * która na starcie ma sześćdziesiąt pozycji, nie jest paletą, tylko biblioteką.
 *
 * Wybranie fiszki niesie zapytanie do biblioteki (`?q=`), a nie samo id: dzięki
 * temu karta ląduje na górze przefiltrowanej listy, zamiast być otwarta gdzieś
 * pod pięćdziesiątym wierszem.
 */
export function cardCommands(cards: Flashcard[], query: string): Command[] {
  if (query.trim() === '') return []
  return cards
    .filter((card) => matches(card.front, query) || matches(card.back, query))
    .slice(0, CARD_LIMIT)
    .map((card) => ({
      id: `card:${card.id}`,
      label: card.front,
      hint: 'fiszka',
      group: 'Fiszki',
      to: `/fiszki?q=${encodeURIComponent(query.trim())}&karta=${card.id}`,
    }))
}

export function filterCommands(commands: Command[], query: string): Command[] {
  if (query.trim() === '') return commands
  return commands.filter(
    (command) => matches(command.label, query) || matches(command.hint ?? '', query),
  )
}

/** Cała lista w kolejności, w jakiej się ją czyta: co robić, gdzie iść, co znaleźć. */
export function buildCommands(cards: Flashcard[], query: string): Command[] {
  return [
    ...filterCommands(navigationCommands(), query),
    ...filterCommands(actionCommands(), query),
    ...cardCommands(cards, query),
  ]
}

/** Kolejna pozycja przy strzałce, z zawijaniem. Pusta lista zostaje na zerze. */
export function moveSelection(index: number, delta: number, length: number): number {
  if (length === 0) return 0
  return (index + delta + length) % length
}
