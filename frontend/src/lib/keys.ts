/**
 * Czyste funkcje pod obsługę klawiatury. React siedzi obok, w hotkeys.tsx.
 *
 * Apka ma dać się obsłużyć bez myszy - to była jedna z rzeczy, których Streamlit
 * nie potrafił, bo każde kliknięcie przeliczało stronę od nowa. Skróty są
 * opisywane deklaratywnie („s", „g d", „mod+k"), a ściągawka pod `?` czyta tę
 * samą listę, więc nie może się z nią rozjechać.
 */

/** Nazwy klawiszy, które w `event.key` przychodzą inaczej, niż się je zapisuje. */
const ALIASES: Record<string, string> = {
  ' ': 'space',
  arrowleft: 'left',
  arrowright: 'right',
  arrowup: 'up',
  arrowdown: 'down',
  escape: 'esc',
}

/** Klawisze nazwane (nie znaki) - tylko przy nich `shift+` ma sens w zapisie. */
const NAMED = new Set([
  'space',
  'left',
  'right',
  'up',
  'down',
  'esc',
  'enter',
  'tab',
  'backspace',
  'delete',
  'home',
  'end',
])

/**
 * Zdarzenie na zapis skrótu: „mod+k", „space", „?", „g".
 *
 * `mod` to Cmd albo Ctrl - jeden zapis na oba systemy. `shift` dokładamy tylko
 * do klawiszy nazwanych: „?" to już efekt shifta na „/", więc „shift+?" byłoby
 * skrótem, którego nie da się wcisnąć.
 */
export function eventToCombo(event: {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}): string {
  const raw = event.key.toLowerCase()
  const key = ALIASES[raw] ?? raw

  const parts: string[] = []
  if (event.metaKey || event.ctrlKey) parts.push('mod')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey && NAMED.has(key)) parts.push('shift')
  parts.push(key)
  return parts.join('+')
}

/**
 * Czy zdarzenie wyszło z pola, w którym użytkownik pisze.
 *
 * Bez tego wpisanie „s" w tytule zadania startowałoby sesję nauki. Sprawdzamy
 * też `isContentEditable`, bo pola edytowalne nie muszą być `<input>`.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export type Binding = {
  /** „s", „g d" (akord), „mod+k". Akord to prefiks, odstęp i klawisz. */
  keys: string
  description: string
  /** Nagłówek sekcji w ściągawce. */
  group?: string
  handler: (event: KeyboardEvent) => void
  /** Skrót działający także w polu tekstowym (praktycznie tylko Esc). */
  allowWhileTyping?: boolean
}

export function isChord(keys: string): boolean {
  return keys.includes(' ')
}

export function chordPrefix(keys: string): string | null {
  const [prefix] = keys.split(' ')
  return prefix ?? null
}

/**
 * Skrót pasujący do stanu: wciśnięty klawisz plus ewentualny oczekujący prefiks.
 *
 * Akord ma pierwszeństwo nad pojedynczym klawiszem, bo skoro prefiks wisi, to
 * użytkownik jest w środku sekwencji - „g" plus „d" ma znaczyć „idź na
 * dashboard", a nie odpalić skrót spod samego „d".
 */
export function resolveBinding(
  bindings: Binding[],
  combo: string,
  pendingPrefix: string | null,
): Binding | undefined {
  if (pendingPrefix) {
    const chord = bindings.find((b) => b.keys === `${pendingPrefix} ${combo}`)
    if (chord) return chord
  }
  return bindings.find((b) => b.keys === combo)
}
