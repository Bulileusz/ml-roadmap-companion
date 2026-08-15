import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'

import {
  useFinishSession,
  useIntroduceCard,
  useRecordAttempt,
  useReviewCard,
  useSaveOwnNote,
  useSessionPlan,
} from '@/api/queries'
import { Summary } from '@/components/session/Summary'
import { IntroStage, QuizStage, ReviewStage } from '@/components/session/stages'
import { Badge, Kbd, Skeleton } from '@/components/ui/primitives'
import { celebrate, celebrateBig } from '@/lib/confetti'
import { useHotkeys } from '@/lib/hotkeys-context'
import { phaseTopic, phaseVisual } from '@/lib/phases'
import {
  boxOf,
  currentStep,
  initSession,
  introQuota,
  isFirstAttempt,
  progressPct,
  questionQuota,
  sessionReducer,
  summarize,
  type SessionState,
} from '@/lib/session-machine'

/** Ile trwa takt awansu pudełka, zanim ekran przesunie się dalej. */
const PROMO_MS = 950

const EMPTY: SessionState = initSession({
  intro: [],
  reviews: [],
  reviews_remaining: 0,
  questions: [],
  phase: null,
  next_task: null,
  total_steps: 0,
  estimated_minutes: 0,
})

export function Sesja() {
  const navigate = useNavigate()
  const query = useSessionPlan()
  const finishSession = useFinishSession()

  const review = useReviewCard()
  const introduce = useIntroduceCard()
  const saveNote = useSaveOwnNote()
  const recordAttempt = useRecordAttempt()

  // Dwie maszyny, nie jedna przełączana: przebieg poprawkowy nie ma prawa
  // nadpisać wyniku sesji, a wynik dzięki temu jest zwykłą pochodną stanu,
  // a nie kopią zamrażaną w efekcie.
  const [main, dispatchMain] = useReducer(sessionReducer, EMPTY)
  const [drill, dispatchDrill] = useReducer(sessionReducer, EMPTY)
  const [drillStarted, setDrillStarted] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const plan = query.data
  const seeded = useRef(false)
  useEffect(() => {
    // Plan bierzemy raz. Ponowne wejście danych w środku sesji przetasowałoby
    // kolejkę pod palcami, więc maszyna dostaje snapshot i już go nie oddaje.
    if (plan && !seeded.current) {
      seeded.current = true
      dispatchMain({ type: 'init', plan })
    }
  }, [plan])

  const drilling = drillStarted && !drill.done
  const state = drilling ? drill : main
  const dispatch = drilling ? dispatchDrill : dispatchMain
  const summary = main.done && main.queue.length > 0 ? summarize(main) : null
  const step = currentStep(state)
  const visual = phaseVisual(plan?.phase?.code)
  const onSummary = Boolean(summary) && !drilling

  useEffect(() => {
    if (!state.promo) return
    const timer = setTimeout(() => dispatch({ type: 'promoEnd' }), PROMO_MS)
    return () => clearTimeout(timer)
  }, [state.promo, dispatch])

  // Domknięcie sesji: raz, po pierwszym wejściu w wynik. Bez setState w efekcie —
  // to są wyłącznie skutki uboczne (unieważnienie cache'u i confetti).
  const closed = useRef(false)
  useEffect(() => {
    if (!summary || closed.current) return
    closed.current = true
    finishSession()
    // Confetti racjonowane: karta doprowadzona do ostatniego pudełka albo
    // sesja bez ani jednej wpadki. Nie po każdej karcie.
    if (summary.mastered > 0) celebrateBig()
    else if (summary.reviewed > 0 && summary.misses.length === 0) celebrate()
  }, [summary, finishSession])

  function grade(correct: boolean) {
    if (step?.kind !== 'review' || state.promo) return
    // Do backendu leci wyłącznie pierwsze podejście — powtórka w tej samej
    // sesji i przebieg poprawkowy są ćwiczeniem (patrz session-machine.ts).
    if (!drilling && isFirstAttempt(state, step.card.id)) {
      review.mutate({ id: step.card.id, correct })
    }
    dispatch({ type: 'grade', correct })
  }

  function intro(note: string) {
    if (step?.kind !== 'intro') return
    if (note !== step.card.own_note) saveNote.mutate({ id: step.card.id, note })
    introduce.mutate(step.card.id)
    dispatch({ type: 'introduced' })
  }

  function redo() {
    if (!plan || !summary || summary.misses.length === 0) return
    const missed = plan.reviews.filter((card) => summary.misses.includes(card.id))
    if (missed.length === 0) return
    setDrillStarted(true)
    dispatchDrill({
      type: 'init',
      plan: { ...plan, intro: [], questions: [], reviews: missed },
    })
  }

  useHotkeys([
    {
      keys: 'space',
      description: 'Odsłoń odpowiedź',
      group: 'Sesja',
      handler: () => {
        if (step?.kind === 'review' && !state.revealed) dispatch({ type: 'reveal' })
      },
    },
    {
      keys: '1',
      description: 'Nie umiałem — karta wraca do pudełka 1',
      group: 'Sesja',
      handler: () => state.revealed && grade(false),
    },
    {
      keys: '2',
      description: 'Umiałem — karta awansuje o pudełko',
      group: 'Sesja',
      handler: () => state.revealed && grade(true),
    },
    {
      keys: 'left',
      description: 'Nie umiałem (alias)',
      group: 'Sesja',
      handler: () => state.revealed && grade(false),
    },
    {
      keys: 'right',
      description: 'Umiałem (alias)',
      group: 'Sesja',
      handler: () => state.revealed && grade(true),
    },
    {
      keys: 'enter',
      description: 'Dalej',
      group: 'Sesja',
      handler: () => {
        if (step?.kind === 'review' && !state.revealed) dispatch({ type: 'reveal' })
        else if (onSummary) void navigate('/')
      },
    },
    {
      keys: 'n',
      description: 'Skocz do pola „moimi słowami"',
      group: 'Sesja',
      handler: () => noteRef.current?.focus(),
    },
    {
      keys: 'r',
      description: 'Powtórz wpadki po sesji',
      group: 'Sesja',
      handler: () => onSummary && redo(),
    },
    {
      keys: 'esc',
      description: 'Zakończ sesję',
      group: 'Sesja',
      allowWhileTyping: true,
      handler: () => {
        if (document.activeElement === noteRef.current) noteRef.current?.blur()
        else if (onSummary) void navigate('/')
        else dispatch({ type: 'finish' })
      },
    },
  ])

  if (query.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Skeleton className="h-40 w-full max-w-[47.5rem]" />
      </div>
    )
  }

  if (query.isError || !plan) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <p className="text-danger text-sm">
          {query.error?.message ?? 'Nie udało się wczytać planu sesji.'}
        </p>
      </div>
    )
  }

  const counter = onSummary
    ? 'zamknięta'
    : step?.kind === 'question'
      ? (() => {
          const { index, total } = questionQuota(state, step.question.id)
          return `pytanie ${index} / ${total}`
        })()
      : `${String(Math.min(state.index + 1, state.queue.length)).padStart(2, '0')} / ${state.queue.length}`

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ '--phase': visual.color } as CSSProperties}
    >
      <div className="bg-line relative h-[3px] shrink-0 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--phase)] transition-[width] duration-300"
          style={{ width: `${onSummary ? 100 : progressPct(state)}%` }}
        />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-6 px-6 py-5 md:px-12">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-ink-faint tabular text-[0.62rem] tracking-[0.18em] uppercase">
            {drilling ? 'Poprawka' : 'Sesja'} · {counter}
          </span>
          {plan.phase ? (
            <span className="truncate text-[0.78rem] text-[var(--phase)]">
              {phaseTopic(plan.phase.name)}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {step?.kind === 'review' ? (
            <Badge>Pudełko {boxOf(state, step.card)}</Badge>
          ) : step?.kind === 'intro' ? (
            <Badge>Nowa</Badge>
          ) : null}
          <button
            onClick={() =>
              onSummary ? void navigate('/') : dispatch({ type: 'finish' })
            }
            className="text-ink-faint hover:text-ink-muted flex items-center gap-2 text-[0.72rem] transition-colors"
          >
            <span>zakończ</span>
            <Kbd>Esc</Kbd>
          </button>
        </div>
      </header>

      {onSummary && summary ? (
        <Summary
          summary={summary}
          plan={plan}
          onRedo={summary.misses.length > 0 ? redo : null}
        />
      ) : step?.kind === 'review' ? (
        <ReviewStage
          key={step.key}
          card={step.card}
          box={boxOf(state, step.card)}
          revealed={state.revealed}
          promo={state.promo}
          onReveal={() => dispatch({ type: 'reveal' })}
          onGrade={grade}
        />
      ) : step?.kind === 'intro' ? (
        <IntroStage
          key={step.key}
          card={step.card}
          phaseName={plan.phase ? phaseTopic(plan.phase.name) : ''}
          quota={introQuota(state, step.card.id)}
          onSaveNote={(note) => saveNote.mutate({ id: step.card.id, note })}
          onNext={intro}
          noteRef={noteRef}
        />
      ) : step?.kind === 'question' ? (
        <QuizStage
          key={step.key}
          question={step.question}
          position={questionQuota(state, step.question.id)}
          onAnswer={(solo) => recordAttempt.mutate({ id: step.question.id, solo })}
          onNext={(solo) => dispatch({ type: 'answered', solo })}
        />
      ) : (
        <EmptyPlan />
      )}
    </div>
  )
}

function EmptyPlan() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <p className="font-display text-ink text-xl font-extrabold">Na dziś czysto</p>
      <p className="text-ink-muted max-w-sm text-sm">
        Żadnych zaległych powtórek ani nowych fiszek w kolejce. Pauza po zrobionej
        robocie to nie zaległość.
      </p>
      <button
        onClick={() => void navigate('/')}
        className="rounded-control border-line-strong hover:bg-raised font-display text-ink mt-2 border px-5 py-2.5 text-sm font-bold transition"
      >
        Wróć na start
      </button>
    </div>
  )
}
