import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type CSSProperties } from 'react'

import { useAchievements } from '@/api/queries'
import type { Achievement } from '@/api/types'
import { Skeleton } from '@/components/ui/primitives'
import { phaseCodeOf, unlockedIds, writeSeen } from '@/lib/achievements'
import { cn } from '@/lib/cn'
import { phaseVisual } from '@/lib/phases'

/**
 * Dorobek — lista osiągnięć, sekcja na dole Dziennika.
 *
 * Świadomie bez własnego ekranu i bez pozycji w nawigacji: to apka otwierana
 * wieczorem do roboty, więc dorobek ma być tłem, nie tematem. Dziennik jest
 * jego naturalnym miejscem — to i tak strona o tym, co już było.
 *
 * Domyślnie widać wyłącznie zdobyte. Niezdobyte są schowane za przełącznikiem,
 * bo to one robią z listy ścianę: zdobytych bywa kilka, celów kilkanaście.
 * Odsłonięte niosą własną podpowiedź („Ucz się 30 dni bez przerwy") — po to
 * backend zwraca `hint`.
 *
 * Bez dat zdobycia, choć makieta je przewidywała: osiągnięcia są **wyliczane**
 * z activity_log przy każdym pobraniu, więc backend nie wie, kiedy próg został
 * przekroczony. Data wymagałaby doliczenia tego momentu; zmyślona byłaby gorsza
 * niż żadna.
 */
export function Dorobek() {
  const achievements = useAchievements()
  const [showLocked, setShowLocked] = useState(false)

  const all = achievements.data ?? []
  const unlocked = all.filter((item) => item.unlocked)
  const locked = all.filter((item) => !item.unlocked)

  // Obejrzana lista to obejrzane osiągnięcia — po wejściu tutaj nie ma czym
  // błyskać po najbliższej sesji. To ta sama pamięć, z której korzysta ekran
  // podsumowania sesji.
  useEffect(() => {
    if (achievements.data) writeSeen(unlockedIds(achievements.data))
  }, [achievements.data])

  if (achievements.isPending) {
    return (
      <section className="pt-10">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-16" />
      </section>
    )
  }

  if (all.length === 0) return null

  return (
    <section className="pt-10">
      <div className="border-line-strong flex items-center gap-3 border-b pb-2">
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          Dorobek
        </span>
        <span className="flex-1" />
        <span className="text-ink-faint tabular text-[0.7rem]">
          {unlocked.length} z {all.length}
        </span>
      </div>

      {unlocked.length === 0 ? (
        <p className="text-ink-faint py-5 text-xs">
          Jeszcze nic zdobytego. Pierwsze jest bliżej, niż wygląda — wystarczy tydzień z
          rzędu.
        </p>
      ) : (
        unlocked.map((item) => <Row key={item.id} achievement={item} />)
      )}

      {locked.length > 0 ? (
        <>
          <button
            onClick={() => setShowLocked((open) => !open)}
            aria-expanded={showLocked}
            className="text-ink-faint hover:text-ink-muted mt-3.5 text-[0.72rem] transition-colors"
          >
            {showLocked
              ? 'Schowaj niezdobyte'
              : `Pokaż też ${locked.length} niezdobytych`}
          </button>

          <AnimatePresence initial={false}>
            {showLocked ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  {locked.map((item) => (
                    <Row key={item.id} achievement={item} />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </section>
  )
}

/** Osiągnięcia fazy niosą jej barwę, reszta jest zielona. */
function Row({ achievement }: { achievement: Achievement }) {
  const code = phaseCodeOf(achievement.id)
  const color = code ? phaseVisual(code).color : 'var(--color-success)'

  return (
    <div
      className="border-line flex items-center gap-3 border-b py-2"
      style={{ '--mark': color } as CSSProperties}
    >
      {/* Te same znaki co na liście zadań w Mapie — zrobione i reszta. */}
      <span
        className={cn(
          'w-3 shrink-0 text-center font-mono text-[0.7rem]',
          achievement.unlocked ? 'text-[var(--mark)]' : 'text-ink-faint',
        )}
        aria-hidden
      >
        {achievement.unlocked ? '✓' : '·'}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 text-[0.85rem]',
          achievement.unlocked ? 'text-ink' : 'text-ink-faint',
        )}
      >
        {achievement.label}
      </span>
      {/* Podpowiedź tylko przy niezdobytych: przy zdobytym „ucz się 7 dni bez
          przerwy" jest już nieaktualną instrukcją, nie informacją. */}
      {achievement.unlocked ? null : (
        <span className="text-ink-faint hidden max-w-[55%] truncate text-[0.7rem] sm:block">
          {achievement.hint}
        </span>
      )}
    </div>
  )
}
