import { createContext, useContext, useEffect, useRef } from 'react'

import type { Binding } from './keys'

/**
 * Kontekst i hooki rejestru skrótów. Sam dostawca siedzi w hotkeys.tsx, bo
 * potrzebuje JSX-a - a moduł mieszający komponent z hookami traci Fast Refresh.
 *
 * Konteksty są **dwa** i to jest istotne, nie kosmetyczne. Jeden trzyma stabilną
 * funkcję rejestrującą, drugi listę skrótów do ściągawki. Wersja z jednym
 * obiektem `{ register, bindings }` zapętlała się w nieskończoność: rejestracja
 * zmieniała `bindings`, to dawało nową wartość kontekstu, przez co efekt
 * rejestrujący uznawał zależność za zmienioną i rejestrował od nowa. Rozdzielenie
 * sprawia, że komponent rejestrujący skróty nie subskrybuje ich listy.
 */
export type Registrar = (bindings: Binding[]) => () => void

export const HotkeysRegistrarContext = createContext<Registrar | null>(null)
export const HotkeysListContext = createContext<Binding[]>([])

/** Rejestruje skróty na czas życia komponentu. */
export function useHotkeys(bindings: Binding[]) {
  const register = useContext(HotkeysRegistrarContext)

  // Handlery czytamy z refa, żeby świeże domknięcie nie wymagało ponownej
  // rejestracji: bez tego każdy render z nowym callbackiem przepisywałby rejestr
  // i gubił wiszący prefiks akordu w połowie sekwencji.
  const latest = useRef(bindings)
  useEffect(() => {
    latest.current = bindings
  })

  // Zależność na treści, nie na tablicy: wywołania podają literał, który przy
  // każdym renderze jest nową referencją.
  const signature = bindings.map((binding) => binding.keys).join('|')

  useEffect(() => {
    if (!register) return
    return register(
      latest.current.map((binding, index) => ({
        ...binding,
        handler: (event) => latest.current[index]?.handler(event),
      })),
    )
  }, [register, signature])
}

/** Wszystkie zarejestrowane skróty - do ściągawki pod `?`. */
export function useHotkeyList(): Binding[] {
  return useContext(HotkeysListContext)
}
