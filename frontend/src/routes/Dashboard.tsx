import { Layers, Sparkles, Target, TrendingUp } from 'lucide-react'

import { useDashboard, usePhases, useSessionPlan } from '@/api/queries'
import type { BoxCount } from '@/api/types'
import { PhaseCard } from '@/components/PhaseCard'
import { LevelBar, StreakFlame } from '@/components/Progression'
import { SessionHero } from '@/components/SessionHero'
import { StatCard } from '@/components/StatCard'
import { Card, Skeleton } from '@/components/ui/primitives'
import { ATTEMPTS, CARDS, TASKS, counted } from '@/lib/plural'

/** Powitanie zależne od godziny - kosztuje trzy linie, a apka wita jak człowiek. */
function greeting(hour: number): string {
  if (hour < 5) return 'Nocna zmiana'
  if (hour < 11) return 'Dzień dobry'
  if (hour < 18) return 'Cześć'
  return 'Dobry wieczór'
}

export function Dashboard() {
  const dashboard = useDashboard()
  const phases = usePhases()
  const session = useSessionPlan()

  const data = dashboard.data
  // Pierwsza faza z niedokończonymi zadaniami jest rozwinięta od wejścia: to ta,
  // w której faktycznie jesteś, więc szukanie jej klikaniem jest pracą za darmo.
  const currentPhaseId = phases.data?.find((entry) => entry.done < entry.total)?.phase
    .id

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <h2 className="font-display text-ink-muted text-sm font-semibold">
          {greeting(new Date().getHours())}
        </h2>
        {data ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
            <div className="w-full max-w-[16rem]">
              <LevelBar progression={data.progression} />
            </div>
            <StreakFlame streak={data.streak} />
          </div>
        ) : (
          <Skeleton className="h-10 w-72" />
        )}
      </header>

      <SessionHero plan={session.data} />

      {dashboard.isError ? (
        <Card className="border-danger/30 p-4">
          <p className="text-danger text-sm">{dashboard.error.message}</p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data ? (
          <>
            <StatCard
              label="Postęp roadmapy"
              value={`${Math.round(data.roadmap.pct)}%`}
              sublabel={`${data.roadmap.done} z ${counted(data.roadmap.total, TASKS)}`}
              pct={data.roadmap.pct}
              color="var(--color-info)"
              icon={Target}
            />
            <StatCard
              label="Do powtórki"
              value={data.due_count}
              sublabel={`${counted(data.cards_total, CARDS)} w rotacji`}
              color="var(--color-info)"
              icon={Layers}
            />
            <StatCard
              label="Do poznania"
              value={data.intro_count}
              sublabel="świeże, bez oceniania"
              color="var(--color-ember)"
              icon={Sparkles}
            />
            <StatCard
              label="Samodzielność"
              value={
                data.independence.total === 0
                  ? '—'
                  : `${Math.round(data.independence.pct)}%`
              }
              sublabel={`${data.independence.independent} z ${counted(
                data.independence.total,
                ATTEMPTS,
              )}`}
              pct={data.independence.pct}
              color="var(--color-success)"
              icon={TrendingUp}
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[5.5rem]" />
          ))
        )}
      </section>

      {data && data.cards_total > 0 ? <LeitnerBoxes boxes={data.boxes} /> : null}

      <section className="space-y-3">
        <h2 className="font-display text-ink-muted px-1 text-xs font-semibold tracking-wide uppercase">
          Fazy roadmapy
        </h2>
        {phases.isPending
          ? Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[5.5rem]" />
            ))
          : phases.data?.map((entry) => (
              <PhaseCard
                key={entry.phase.id}
                entry={entry}
                defaultOpen={entry.phase.id === currentPhaseId}
              />
            ))}
      </section>
    </div>
  )
}

/**
 * Rozkład fiszek po pudełkach Leitnera.
 *
 * Poziome słupki proporcjonalne do największego pudełka, nie do sumy: przy 70
 * kartach w pudełku 1 i dwóch w piątym słupki liczone od sumy byłyby niewidoczne
 * i wykres nie mówiłby nic. Chodzi o kształt rozkładu, nie o udziały procentowe.
 */
function LeitnerBoxes({ boxes }: { boxes: BoxCount[] }) {
  const peak = Math.max(...boxes.map((box) => box.count), 1)

  return (
    <Card className="p-4">
      <h2 className="text-ink-muted mb-3 text-xs font-medium">Pudełka Leitnera</h2>
      <div className="space-y-2">
        {boxes.map((box) => (
          <div key={box.box} className="flex items-center gap-3">
            <span className="text-ink-faint tabular w-14 shrink-0 text-xs">
              pudełko {box.box}
            </span>
            <div className="bg-line-strong h-2.5 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${(box.count / peak) * 100}%`,
                  // Barwa jaśnieje z pudełkiem: świeża karta chłodna i ciemna,
                  // opanowana - zielona. Ten sam ruch, który wersja streamlitowa
                  // robiła kolorami badge'ów.
                  background: `color-mix(in oklab, var(--color-success) ${box.box * 20}%, var(--color-info))`,
                }}
              />
            </div>
            <span className="text-ink tabular w-7 shrink-0 text-right text-xs font-medium">
              {box.count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
