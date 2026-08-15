import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import { useDashboard } from '@/api/queries'
import type { SessionPlan } from '@/api/types'
import { AnimatedNumber, Kbd } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { CARDS, QUESTIONS, counted } from '@/lib/plural'
import { XP, type SessionSummary } from '@/lib/session-machine'

/**
 * Wynik sesji jako rachunek.
 *
 * XP pokazane działaniem (`Powtórki · 6 × 2 · +12`), nie samą sumą: przy
 * systemie, w którym punkty są wyliczane z dziennika, pokazanie arytmetyki jest
 * tym, co czyni liczbę wiarygodną zamiast arbitralną.
 *
 * Wiersze o zerowej wartości zostają na ekranie, tylko wyszarzone — „Notatki
 * 2 × 0" mówi „widzę, że pisałeś, punktów za to nie ma", a ukrycie tego wiersza
 * zostawiałoby pytanie bez odpowiedzi.
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
  // Dorobek po sesji — `finishSession()` już unieważnił to zapytanie, więc
  // poziom jest ten po naliczeniu punktów, nie sprzed.
  const dashboard = useDashboard()
  const progression = dashboard.data?.progression

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
      label: 'Rozwiązane samodzielnie',
      calc: `${summary.solo} × ${XP.solo}`,
      value: summary.xpSolo,
    },
    { label: 'Notatki', calc: '× 0', value: 0 },
  ]

  const stats = [
    { value: `${summary.correct}`, label: 'za pierwszym razem', tone: 'text-success' },
    {
      value: `${summary.misses.length}`,
      label: 'do poprawki',
      tone: summary.misses.length ? 'text-danger' : 'text-ink-faint',
    },
    {
      value: `${summary.promoted}`,
      label: 'awansów pudełka',
      tone: summary.promoted ? 'text-ink' : 'text-ink-faint',
    },
    {
      value: `${summary.solo}/${summary.answered}`,
      label: 'pytań samodzielnie',
      tone: summary.solo ? 'text-ink' : 'text-ink-faint',
    },
    {
      value: progression ? `lvl ${progression.level}` : '—',
      label: 'poziom',
      tone: 'text-[var(--color-ember)]',
    },
  ]

  const cards = summary.reviewed + summary.introduced
  const breakdown = [
    `${counted(summary.reviewed, CARDS)} do powtórki`,
    summary.introduced ? `${summary.introduced} nowych` : null,
    summary.answered ? counted(summary.answered, QUESTIONS) : null,
  ].filter(Boolean)

  return (
    <div className="flex-1 overflow-auto px-6 py-8 md:px-12 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.2, 0.8, 0.25, 1] }}
        className="mx-auto w-full max-w-[45rem]"
      >
        <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
          Sesja zakończona
        </span>

        <div className="flex items-end justify-between gap-6 pt-3 pb-2.5">
          <h1 className="font-display text-ink text-3xl leading-none font-extrabold tracking-tight md:text-[2.6rem]">
            {counted(cards, CARDS)}
          </h1>
          <span
            aria-label={`Zdobyte ${summary.xpTotal} XP`}
            className="font-display tabular text-xl font-extrabold tracking-tight text-[var(--color-ember)] md:text-3xl"
          >
            +<AnimatedNumber value={summary.xpTotal} /> XP
          </span>
        </div>
        <p className="text-ink-muted mb-5 text-sm">
          {summary.misses.length
            ? 'Zostało kilka rzeczy do dociągnięcia.'
            : summary.reviewed
              ? 'Wszystko poszło za pierwszym razem.'
              : 'Sesja zamknięta.'}
          {breakdown.length ? ` ${breakdown.join(' · ')}.` : ''}
        </p>
        <div className="bg-line-strong h-px" />

        <section className="pt-1.5 pb-5">
          {ledger.map((row) => {
            const off = row.value === 0
            return (
              <div
                key={row.label}
                className="border-line flex items-baseline gap-4 border-b py-3.5"
              >
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    off ? 'text-ink-faint' : 'text-ink',
                  )}
                >
                  {row.label}
                </span>
                <span className="text-ink-faint font-mono text-[0.72rem]">
                  {row.calc}
                </span>
                <span
                  className={cn(
                    'font-display tabular w-16 shrink-0 text-right text-[0.95rem] font-bold',
                    off ? 'text-ink-faint' : 'text-ink',
                  )}
                >
                  {off ? '0' : `+${row.value}`}
                </span>
              </div>
            )
          })}
        </section>

        <section className="border-line rounded-card mb-6 flex overflow-hidden border">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                'flex min-w-0 flex-1 flex-col gap-1 px-4 py-4',
                index > 0 && 'border-line border-l',
              )}
            >
              <span
                className={cn(
                  'font-display tabular text-xl font-extrabold tracking-tight',
                  stat.tone,
                )}
              >
                {stat.value}
              </span>
              <span className="text-ink-faint text-[0.66rem] tracking-[0.02em] text-pretty">
                {stat.label}
              </span>
            </div>
          ))}
        </section>

        {progression ? (
          <section className="mb-6 flex items-center gap-4">
            <span className="text-ink-faint shrink-0 text-[0.72rem]">
              Poziom {progression.level}
            </span>
            <div className="bg-line-strong relative h-0.5 flex-1 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[var(--color-ember)] transition-[width] duration-700"
                style={{ width: `${progression.pct}%` }}
              />
            </div>
            <span className="text-ink-faint tabular shrink-0 text-[0.72rem]">
              {progression.xp_into_level} / {progression.xp_for_next_level} XP
            </span>
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
