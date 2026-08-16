import type { CSSProperties, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  useAchievements,
  usePhaseTasks,
  usePhases,
  useDashboard,
  useSessionPlan,
} from '@/api/queries'
import type { Dashboard, SessionPlan } from '@/api/types'
import { Page } from '@/components/AppShell'
import { StreakFlame } from '@/components/Progression'
import { AnimatedNumber, Badge, Kbd, Skeleton } from '@/components/ui/primitives'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import { CARDS, MINUTES, QUESTIONS, counted } from '@/lib/plural'

/** „Sobota, 15 sierpnia" — nagłówek dnia zamiast powitania. */
function todayLabel(): string {
  const text = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function Dzis() {
  const dashboard = useDashboard()
  const session = useSessionPlan()
  const phases = usePhases()

  const current = phases.data?.find((entry) => entry.done < entry.total)
  const tasks = usePhaseTasks(current?.phase.id ?? 0, Boolean(current))
  const visual = phaseVisual(current?.phase.code)

  return (
    <Page>
      <div style={{ '--phase': visual.color } as CSSProperties}>
        <header className="flex items-baseline justify-between gap-6 pb-4">
          <h1 className="font-display text-ink text-2xl font-extrabold tracking-tight md:text-[1.7rem]">
            {todayLabel()}
          </h1>
          {dashboard.data ? <StreakFlame streak={dashboard.data.streak} /> : null}
        </header>

        <div className="bg-line-strong h-px" />

        <Teraz plan={session.data} />

        <div className="bg-line h-px" />

        <section className="pt-6">
          <div className="flex items-center gap-3 pb-1">
            <Label>Dalej w tej fazie</Label>
            <span className="bg-line h-px flex-1" />
            <span className="text-ink-faint tabular text-[0.72rem]">
              {current ? `${current.done} z ${current.total}` : ''}
            </span>
          </div>

          {tasks.isPending && current ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : (
            (tasks.data ?? [])
              .filter((task) => !task.is_done)
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  className="border-line flex items-stretch gap-4 border-b"
                >
                  {/* Pełnowysokościowa krawędź w barwie fazy zamiast kropki —
                      ten sam sygnał, ale widoczny na liście z odległości. */}
                  <span
                    className="w-[3px] shrink-0"
                    style={{ background: 'var(--phase)' }}
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-4 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-ink truncate text-[0.95rem] font-bold tracking-tight">
                        {task.title}
                      </span>
                      <span className="text-ink-faint text-[0.72rem] tracking-[0.02em]">
                        {current ? phaseTopic(current.phase.name) : ''}
                      </span>
                    </div>
                    <Badge>Faza {current?.phase.code}</Badge>
                  </div>
                </div>
              ))
          )}

          {!current && !phases.isPending ? (
            <p className="text-ink-faint py-6 text-sm">
              Cała roadmapa odhaczona. Nauka się nie kończy — powtórki lecą dalej.
            </p>
          ) : null}
        </section>

        {dashboard.data ? <Poziom data={dashboard.data} /> : null}
      </div>
    </Page>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-ink-faint text-[0.62rem] tracking-[0.18em] uppercase">
      {children}
    </span>
  )
}

function Teraz({ plan }: { plan: SessionPlan | undefined }) {
  const navigate = useNavigate()

  if (!plan) {
    return (
      <section className="py-7">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-48" />
      </section>
    )
  }

  const empty = plan.total_steps === 0
  const boxes = plan.reviews.map((card) => card.box)
  const range =
    boxes.length === 0
      ? null
      : boxes.length === 1 || Math.min(...boxes) === Math.max(...boxes)
        ? `pudełko ${boxes[0]}`
        : `pudełka ${Math.min(...boxes)}–${Math.max(...boxes)}`

  const parts = [
    plan.intro.length ? `${counted(plan.intro.length, CARDS)} do poznania` : null,
    plan.reviews.length ? `${counted(plan.reviews.length, CARDS)} do powtórki` : null,
    plan.questions.length ? counted(plan.questions.length, QUESTIONS) : null,
  ].filter(Boolean)

  return (
    <section className="flex items-center justify-between gap-7 py-7">
      <div className="flex min-w-0 flex-col gap-2">
        <Label>Teraz</Label>
        <span className="font-display text-ink text-2xl leading-tight font-extrabold tracking-tight md:text-3xl">
          {empty ? 'Na dziś czysto' : 'Sesja nauki'}
        </span>
        <span className="text-ink-muted tabular text-[0.82rem]">
          {empty
            ? 'Żadnych zaległych powtórek ani nowych fiszek w kolejce.'
            : [...parts, `około ${counted(plan.estimated_minutes, MINUTES)}`, range]
                .filter(Boolean)
                .join(' · ')}
        </span>
      </div>

      {empty ? null : (
        <button
          onClick={() => void navigate('/sesja')}
          className="rounded-control border-info/40 bg-info/10 hover:bg-info/20 font-display text-ink flex shrink-0 items-center gap-3 border px-5 py-3.5 text-[0.92rem] font-bold transition hover:-translate-y-px"
        >
          <span>Zacznij</span>
          <Kbd>s</Kbd>
        </button>
      )}
    </section>
  )
}

function Poziom({ data }: { data: Dashboard }) {
  const { progression } = data
  const achievements = useAchievements()
  const zdobyte = achievements.data?.filter((item) => item.unlocked).length

  return (
    <section className="flex items-center gap-4 pt-8">
      <span className="text-ink-faint text-[0.72rem] tracking-[0.02em]">
        Poziom {progression.level}
      </span>
      {/* Włosowy pasek zamiast grubego progress bara: dorobek jest tłem dnia,
          nie jego tematem. */}
      <div className="bg-line-strong relative h-0.5 flex-1 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-ember)] transition-[width] duration-700"
          style={{ width: `${progression.pct}%` }}
        />
      </div>
      <span className="text-ink-faint tabular text-[0.72rem]">
        <AnimatedNumber value={progression.xp_into_level} /> /{' '}
        {progression.xp_for_next_level} XP
      </span>
      {/* Dorobek nie dostaje własnego ekranu — tylko tę jedną liczbę, i to
          w linii, która i tak już tu była. Pełna lista siedzi w Dzienniku. */}
      {achievements.data ? (
        <Link
          to="/dziennik"
          className="text-ink-faint hover:text-ink tabular shrink-0 text-[0.72rem] transition-colors"
        >
          {zdobyte} z {achievements.data.length} odznak
        </Link>
      ) : null}
    </section>
  )
}
