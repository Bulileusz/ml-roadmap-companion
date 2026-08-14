import { motion, useReducedMotion } from 'motion/react'

import { AnimatedNumber } from '@/components/ui/primitives'
import type { Progression, Streak } from '@/api/types'
import { DAYS, counted } from '@/lib/plural'
import { SPRING_VALUE } from '@/lib/motion'

/**
 * Licznik serii z płomieniem.
 *
 * Płomień rysowany ręcznie w SVG, nie ikoną z Lucide: potrzebuje gradientu
 * (dolna część chłodniejsza, końcówka jaśniejsza) i własnego pulsowania, a ikona
 * ze zbioru jest jednokolorowa i statyczna. Pulsowanie jest wolne i o kilka
 * procent skali - ogień ma żyć, nie migać.
 */
export function StreakFlame({ streak }: { streak: Streak }) {
  const reduced = useReducedMotion()
  const alive = streak.current > 0

  return (
    <div className="flex items-center gap-2.5">
      <motion.svg
        width="22"
        height="26"
        viewBox="0 0 22 26"
        aria-hidden
        animate={reduced || !alive ? {} : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="60%" stopColor="var(--color-ember)" />
            <stop offset="100%" stopColor="var(--color-ember-bright)" />
          </linearGradient>
        </defs>
        <path
          d="M11 1c3.2 3.6 4.4 6 4.4 8.2 0 1.7-1 3-2.5 3.4 1 .5 1.7 1.6 1.7 3 0 2.6-2 4.4-4.6 4.4S5.4 18.2 5.4 15c0-4.2 3-6.3 3-9.3 0-1.2-.3-2.4-.9-3.5C9 1.4 10 .6 11 1Z"
          fill={alive ? 'url(#flame)' : 'var(--color-line-strong)'}
        />
      </motion.svg>
      <div className="leading-tight">
        <p className="font-display text-ink text-lg font-extrabold">
          <AnimatedNumber value={streak.current} />
          <span className="text-ink-muted ml-1 text-xs font-medium">
            {counted(streak.current, DAYS).split(' ')[1]}
          </span>
        </p>
        <p className="text-ink-faint text-[0.7rem]">rekord: {streak.longest}</p>
      </div>
    </div>
  )
}

/**
 * Poziom i pasek XP.
 *
 * Wypełnienie ma delikatny gradient w barwach ognia, tych samych co seria - XP
 * i seria to jedna rodzina „dorobku", odróżniana od akcji, które są chłodne.
 */
export function LevelBar({ progression }: { progression: Progression }) {
  const reduced = useReducedMotion()
  const remaining = progression.xp_for_next_level - progression.xp_into_level

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="font-display text-ink text-sm font-bold">
          Poziom <AnimatedNumber value={progression.level} />
        </p>
        <p className="text-ink-faint text-[0.7rem]">
          <AnimatedNumber value={progression.xp} /> XP · do następnego {remaining}
        </p>
      </div>
      <div
        className="bg-line-strong h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={Math.round(progression.pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Postęp do poziomu ${progression.level + 1}`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-ember)] to-[var(--color-ember-bright)]"
          initial={{ width: reduced ? `${progression.pct}%` : 0 }}
          animate={{ width: `${progression.pct}%` }}
          transition={reduced ? { duration: 0 } : SPRING_VALUE}
        />
      </div>
    </div>
  )
}
