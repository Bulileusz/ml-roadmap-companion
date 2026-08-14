import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { HotkeysListContext, HotkeysRegistrarContext } from './hotkeys-context'
import {
  chordPrefix,
  eventToCombo,
  isChord,
  isTypingTarget,
  resolveBinding,
  type Binding,
} from './keys'

/** Ile czasu ma użytkownik na dokończenie akordu („g", potem „d"). */
const CHORD_WINDOW_MS = 1200

/**
 * Jeden nasłuch na okno dla wszystkich skrótów w apce.
 *
 * Alternatywą byłby `addEventListener` w każdym komponencie, ale wtedy nie da
 * się ani rozstrzygnąć akordów (wiszący prefiks byłby osobny w każdym nasłuchu),
 * ani wypisać ściągawki - a ściągawka, która nie jest tą samą listą co skróty,
 * kłamie po pierwszej zmianie.
 */
export function HotkeysProvider({ children }: { children: ReactNode }) {
  // Ref do rozstrzygania zdarzeń (bez re-renderu), state do ściągawki.
  const registry = useRef<Binding[][]>([])
  const [bindings, setBindings] = useState<Binding[]>([])
  const pending = useRef<{ prefix: string; at: number } | null>(null)

  const register = useCallback((incoming: Binding[]) => {
    registry.current = [...registry.current, incoming]
    setBindings(registry.current.flat())
    return () => {
      registry.current = registry.current.filter((group) => group !== incoming)
      setBindings(registry.current.flat())
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const combo = eventToCombo(event)
      const all = registry.current.flat()

      const typing = isTypingTarget(event.target)
      const candidates = typing ? all.filter((b) => b.allowWhileTyping) : all

      const stale =
        pending.current !== null && Date.now() - pending.current.at > CHORD_WINDOW_MS
      const prefix = stale ? null : (pending.current?.prefix ?? null)

      const match = resolveBinding(candidates, combo, prefix)
      if (match) {
        pending.current = null
        event.preventDefault()
        match.handler(event)
        return
      }

      // Nietrafiony klawisz, który jest prefiksem jakiegoś akordu, otwiera okno
      // na drugi klawisz. Każdy inny je zamyka, żeby „g" plus przypadkowy klik
      // nie wisiały w nieskończoność.
      const opensChord = candidates.some(
        (b) => isChord(b.keys) && chordPrefix(b.keys) === combo,
      )
      pending.current = opensChord ? { prefix: combo, at: Date.now() } : null
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Dwa dostawcy, nie jeden obiekt: `register` jest stabilne przez cały czas
  // życia dostawcy, a `bindings` zmienia się przy każdej rejestracji. Sklejone
  // w jedną wartość dawały pętlę - patrz komentarz w hotkeys-context.ts.
  return (
    <HotkeysRegistrarContext value={register}>
      <HotkeysListContext value={bindings}>{children}</HotkeysListContext>
    </HotkeysRegistrarContext>
  )
}
