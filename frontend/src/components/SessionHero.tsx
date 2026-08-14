import { ArrowRight, BookOpen, Layers, Sparkles, SquareStack } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import type { SessionPlan } from '@/api/types'
import { Button, Card, Kbd, Skeleton } from '@/components/ui/primitives'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import { CARDS, MINUTES, QUESTIONS, counted } from '@/lib/plural'
import { SPRING } from '@/lib/motion'

/**
 * Karta „zacznij sesję" - jedyny przycisk, który trzeba znaleźć wchodząc do apki.
 *
 * Po to jest cała ta migracja: w wersji streamlitowej nauka rozsypywała się na
 * pięć stron, które trzeba było odwiedzić z pamięci, i nic nie mówiło „na dziś
 * masz tyle". Tutaj plan dnia jest pierwszą rzeczą na ekranie, z rozbiciem na
 * etapy i szacunkiem czasu, żeby decyzja „siadam teraz" nie wymagała zgadywania.
 */
export function SessionHero({ plan }: { plan: SessionPlan | undefined }) {
  const navigate = useNavigate()

  if (!plan) {
    return (
      <Card className="p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-5 h-12 w-full max-w-xs" />
      </Card>
    )
  }

  const visual = phaseVisual(plan.phase?.code)
  const empty = plan.total_steps === 0
  const steps = [
    {
      icon: Sparkles,
      count: plan.intro.length,
      label: counted(plan.intro.length, CARDS),
      hint: 'do poznania',
    },
    {
      icon: Layers,
      count: plan.reviews.length,
      label: counted(plan.reviews.length, CARDS),
      hint: 'do powtórki',
    },
    {
      icon: SquareStack,
      count: plan.questions.length,
      label: counted(plan.questions.length, QUESTIONS),
      hint: 'do sprawdzenia',
    },
  ].filter((step) => step.count > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      style={{ '--phase': visual.color } as React.CSSProperties}
    >
      <Card className="phase-wash relative overflow-hidden p-6 md:p-7">
        {/* Poświata w barwie fazy zamiast pełnego gradientu na tle: ma podnieść
            kartę, a nie zamalować treści. blur-3xl i mały rozmiar, bo większy
            plamiłby cały nagłówek. */}
        <div
          className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{ background: visual.color }}
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <visual.icon size={15} style={{ color: visual.color }} />
            <p className="text-ink-muted text-xs font-medium">
              {plan.phase ? phaseTopic(plan.phase.name) : 'Sesja dnia'}
            </p>
          </div>

          {empty ? (
            <>
              <h1 className="font-display text-ink mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                Na dziś czysto
              </h1>
              <p className="text-ink-muted mt-2 max-w-md text-sm">
                Żadnych zaległych powtórek ani nowych fiszek w kolejce. Możesz dorzucić
                materiał do <code className="font-mono text-xs">content/</code> albo
                wrócić jutro — pauza po zrobionej robocie to nie zaległość.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-ink mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                Dzisiejsza sesja
              </h1>
              <p className="text-ink-muted mt-1.5 text-sm">
                {counted(plan.estimated_minutes, MINUTES)}
                {plan.reviews_remaining > 0
                  ? ` · ${plan.reviews_remaining} powtórek zostanie na później`
                  : ''}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {steps.map((step) => (
                  <span
                    key={step.hint}
                    className="border-line bg-raised text-ink-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                  >
                    <step.icon size={13} style={{ color: visual.color }} />
                    <span className="text-ink font-medium">{step.label}</span>
                    {step.hint}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => void navigate('/session')}
                  className="shadow-lift"
                >
                  Zacznij sesję
                  <ArrowRight size={17} />
                </Button>
                <span className="text-ink-faint hidden items-center gap-1.5 text-xs md:flex">
                  albo <Kbd>s</Kbd>
                </span>
              </div>
            </>
          )}

          {plan.next_task ? (
            <div className="border-line mt-6 flex items-start gap-2.5 border-t pt-4">
              <BookOpen size={15} className="text-ink-faint mt-0.5 shrink-0" />
              <p className="text-ink-muted min-w-0 text-xs">
                <span className="text-ink-faint">następne zadanie: </span>
                <span className="text-ink">{plan.next_task.title}</span>
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </motion.div>
  )
}
