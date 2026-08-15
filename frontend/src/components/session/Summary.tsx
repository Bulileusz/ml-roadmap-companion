import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import type { SessionPlan } from '@/api/types'
import { AnimatedNumber, Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { XP, type SessionSummary } from '@/lib/session-machine'
import { CARDS, QUESTIONS, counted } from '@/lib/plural'

/**
 * Wynik sesji jako rachunek.
 *
 * XP pokazane działaniem (`Powtórki · 6 × 2 · +12`), nie samą sumą: przy
 * systemie, w którym punkty są wyliczane z dziennika, pokazanie arytmetyki jest
 * tym, co czyni liczbę wiarygodną zamiast arbitralną. Widać też, za co punktów
 * NIE ma — wiersz notatek stoi na zero i to jest uczciwa informacja, nie błąd.
 */
export function Summary({
  summary,
  plan,
  onRedo,
}: {
  summary: SessionSummary
  plan: SessionPlan
  onRedo: (() => void) | null
}) {
  const navigate = useNavigate()

  const ledger = [
    {
      label: 'Powtórki',
      calc: `${summary.reviewed} × ${XP.review}`,
      value: summary.xpReviews,
    },
    {
      label: 'Nowe karty',
      calc: `${summary.introduced} × ${XP.intro}`,
      value: summary.xpIntros,
    },
    {
      label: 'Pytania',
      calc: `${summary.answered} × ${XP.question}`,
      value: summary.xpQuestions,
    },
    {
      label: 'Samodzielnie',
      calc: `${summary.solo} × ${XP.solo}`,
      value: summary.xpSolo,
    },
  ].filter((row) => row.value > 0)

  const stats = [
    { value: summary.correct, label: 'umiałem', tone: 'text-success' },
    { value: summary.misses.length, label: 'do poprawki', tone: 'text-danger' },
    { value: summary.mastered, label: 'w pudełku 5', tone: 'text-ink' },
  ].filter((stat) => stat.value > 0 || stat.label === 'umiałem')

  return (
    <div className="flex-1 overflow-auto px-6 py-10 md:px-12 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.25, 1] }}
        className="mx-auto w-full max-w-[45rem]"
      >
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          Sesja zakończona
        </span>

        <div className="flex items-end justify-between gap-6 pt-3 pb-5">
          <h1 className="font-display text-ink text-3xl leading-none font-extrabold tracking-tight md:text-[2.75rem]">
            {counted(summary.reviewed + summary.introduced, CARDS)}
            {summary.answered > 0 ? (
              <span className="text-ink-faint font-bold">
                {' '}
                i {counted(summary.answered, QUESTIONS)}
              </span>
            ) : null}
          </h1>
          <span
            aria-label={`Zdobyte ${summary.xpTotal} XP`}
            className="font-display tabular text-xl font-extrabold tracking-tight text-[var(--color-ember)] md:text-3xl"
          >
            +<AnimatedNumber value={summary.xpTotal} /> XP
          </span>
        </div>
        <div className="bg-line-strong h-px" />

        <section className="pt-1.5 pb-5">
          {ledger.length === 0 ? (
            <p className="text-ink-faint py-4 text-sm">
              Sesja zamknięta bez ani jednej oceny — punktów nie ma za co naliczyć.
            </p>
          ) : (
            ledger.map((row) => (
              <div
                key={row.label}
                className="border-line flex items-baseline gap-4 border-b py-3.5"
              >
                <span className="text-ink min-w-0 flex-1 text-sm">{row.label}</span>
                <span className="text-ink-faint font-mono text-[0.72rem]">
                  {row.calc}
                </span>
                <span className="font-display text-ink tabular w-16 shrink-0 text-right text-[0.95rem] font-bold">
                  +{row.value}
                </span>
              </div>
            ))
          )}
          <div className="border-line flex items-baseline gap-4 border-b py-3.5">
            <span className="text-ink-faint min-w-0 flex-1 text-sm">Notatki</span>
            <span className="text-ink-faint font-mono text-[0.72rem]">× 0</span>
            <span className="font-display text-ink-faint tabular w-16 shrink-0 text-right text-[0.95rem] font-bold">
              0
            </span>
          </div>
        </section>

        {summary.reviewed > 0 ? (
          <section className="border-line rounded-card mb-6 flex overflow-hidden border">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  'flex flex-1 flex-col gap-1 px-5 py-4',
                  index > 0 && 'border-line border-l',
                )}
              >
                <span
                  className={cn(
                    'font-display tabular text-xl font-extrabold tracking-tight',
                    stat.tone,
                  )}
                >
                  <AnimatedNumber value={stat.value} />
                </span>
                <span className="text-ink-faint text-[0.7rem] tracking-[0.02em]">
                  {stat.label}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {plan.next_task ? (
          <div className="border-line mb-6 border-t pt-5">
            <span className="text-ink-faint text-[0.62rem] tracking-[0.16em] uppercase">
              Następne zadanie
            </span>
            <p className="font-display text-ink mt-1.5 text-[0.95rem] font-bold">
              {plan.next_task.title}
            </p>
            <p className="text-ink-faint mt-0.5 text-[0.72rem]">
              {plan.next_task.phase_name}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {onRedo ? (
            <button
              onClick={onRedo}
              className="rounded-control border-line-strong hover:bg-raised font-display text-ink flex items-center gap-3 border px-5 py-3 text-[0.88rem] font-bold transition"
            >
              Popraw {counted(summary.misses.length, CARDS)}
              <Kbd>R</Kbd>
            </button>
          ) : null}
          <button
            onClick={() => void navigate('/')}
            className="rounded-control border-info/40 bg-info/10 hover:bg-info/20 font-display text-ink flex items-center gap-3 border px-5 py-3 text-[0.88rem] font-bold transition"
          >
            Wróć na start
            <Kbd>⏎</Kbd>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
