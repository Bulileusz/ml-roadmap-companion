import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { useAchievements } from '@/api/queries'
import type { Achievement } from '@/api/types'
import {
  freshlyUnlocked,
  isBigDeal,
  phaseCodeOf,
  readSeen,
  unlockedIds,
  writeSeen,
} from '@/lib/achievements'
import { celebrate, celebrateBig } from '@/lib/confetti'
import { phaseVisual } from '@/lib/phases'

/**
 * Jedyne miejsce, w którym dorobek się odzywa.
 *
 * Siedzi w powłoce, nie na ekranie sesji, bo osiągnięcia nie zdarzają się tylko
 * w sesji: domknięcie fazy — czyli największe wydarzenie w tej apce — przychodzi
 * z odhaczenia ostatniego zadania na Mapie. Wersja przypięta do podsumowania
 * sesji pokazałaby je z opóźnieniem albo wcale.
 *
 * Poza tym jednym momentem dorobek nie zabiera miejsca: pełna lista jest sekcją
 * na dole Dziennika, a na „Dziś" zostaje jedna liczba przy pasku poziomu.
 */

/** Ile toast zostaje na ekranie. Rzadkie zdarzenie, więc może chwilę powisieć. */
const VISIBLE_MS = 9000

export function UnlockToast() {
  const [gained, setGained] = useState<Achievement[]>([])
  useWatch(setGained)

  useEffect(() => {
    if (gained.length === 0) return
    const timer = setTimeout(() => setGained([]), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [gained])

  return (
    <AnimatePresence>
      {gained.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.25, 1] }}
          className="fixed right-4 bottom-4 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        >
          {gained.map((item) => {
            const code = phaseCodeOf(item.id)
            const color = code ? phaseVisual(code).color : 'var(--color-ember)'
            return (
              <div
                key={item.id}
                role="status"
                className="rounded-control bg-surface flex items-center gap-3.5 border px-4 py-3"
                style={{
                  borderColor: `color-mix(in oklab, ${color} 38%, transparent)`,
                }}
              >
                <span className="text-[0.95rem]" style={{ color }} aria-hidden>
                  ✦
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-ink truncate text-[0.9rem] font-extrabold tracking-tight">
                    {item.label}
                  </p>
                  <p className="text-ink-faint text-[0.7rem]">zdobyte przed chwilą</p>
                </div>
                <button
                  onClick={() =>
                    setGained((rest) => rest.filter((x) => x.id !== item.id))
                  }
                  aria-label={`Schowaj: ${item.label}`}
                  className="text-ink-faint hover:text-ink shrink-0 text-[0.8rem] transition-colors"
                >
                  ×
                </button>
              </div>
            )
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Różnica między tym, co zdobyte, a tym, co już widziane.
 *
 * Liczona przy każdej zmianie danych, nie raz na montaż: mutacje unieważniają
 * `/api/achievements`, więc pierwsza migawka po odhaczeniu zadania bywa jeszcze
 * ta sprzed. Ocena wyłącznie na niej przegapiłaby dokładnie to osiągnięcie, dla
 * którego ten komponent istnieje.
 */
function useWatch(onGained: (fn: (previous: Achievement[]) => Achievement[]) => void) {
  const achievements = useAchievements()
  // Co już pokazaliśmy — żeby kolejny refetch nie zdublował wiersza ani nie
  // odpalił confetti drugi raz.
  const shown = useRef<Set<string>>(new Set())

  useEffect(() => {
    const data = achievements.data
    if (!data) return

    const swieze = freshlyUnlocked(readSeen(), data).filter(
      (item) => !shown.current.has(item.id),
    )
    writeSeen(unlockedIds(data))
    if (swieze.length === 0) return

    for (const item of swieze) shown.current.add(item.id)
    onGained((previous) => [...previous, ...swieze])
    if (isBigDeal(swieze)) celebrateBig()
    else celebrate()
    // onGained jest setterem stanu — stabilny między renderami, więc nie ma
    // potrzeby wciągać go w zależności.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements.data])
}
