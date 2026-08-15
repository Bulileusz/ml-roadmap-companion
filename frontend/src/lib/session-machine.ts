import type { Flashcard, Question, SessionPlan } from '@/api/types'

import { MAX_BOX, nextBox } from './leitner'

/**
 * Przebieg sesji dnia jako czysty reduktor.
 *
 * Cała logika kolejki, wpadek i liczenia wyniku siedzi tutaj, poza Reactem,
 * bo to jedyna część PR-a z prawdziwą liczbą przypadków brzegowych: karta
 * wracająca w tej samej sesji, pierwsze podejście kontra powtórne, sesja
 * kończąca się w środku etapu. Komponent tylko renderuje stan i decyduje,
 * co wysłać do API.
 *
 * **Kluczowa zasada: do backendu leci wyłącznie PIERWSZE podejście do karty.**
 * Karta oceniona „nie umiałem" wraca w tej sesji, ale to powtórne pokazanie
 * jest ćwiczeniem, nie powtórką: odpowiedź widziałeś minutę temu, więc
 * zaliczenie jej nie jest wyciąganiem z pamięci i nie ma prawa ani awansować
 * pudełka, ani dawać XP. Bez tego dałoby się nabijać punkty celowym
 * oblewaniem, a podpis „wraca dziś, pudełko 1" przestawałby być prawdą.
 */

export type SessionStep =
  | { key: string; kind: 'intro'; card: Flashcard }
  | { key: string; kind: 'review'; card: Flashcard }
  | { key: string; kind: 'question'; question: Question }

export type SessionState = {
  queue: SessionStep[]
  index: number
  revealed: boolean
  /** Takt awansu pudełka: trzyma ekran przez chwilę po trafieniu. */
  promo: { from: number; to: number } | null
  /** cardId -> aktualne pudełko, aktualizowane tylko przy pierwszym podejściu. */
  boxes: Record<number, number>
  /** cardId -> czy pierwsze podejście było trafione. */
  firstTry: Record<number, boolean>
  /** cardId w kolejności pierwszego ocenienia - to poszło do backendu. */
  graded: number[]
  introduced: number[]
  answered: { id: number; solo: boolean }[]
  /** Karty już raz wrzucone z powrotem do kolejki - drugi raz nie wracają. */
  requeued: number[]
  done: boolean
}

export type SessionAction =
  | { type: 'init'; plan: SessionPlan }
  | { type: 'reveal' }
  | { type: 'grade'; correct: boolean }
  | { type: 'promoEnd' }
  | { type: 'introduced' }
  | { type: 'answered'; solo: boolean }
  | { type: 'finish' }

export function initSession(plan: SessionPlan): SessionState {
  const queue: SessionStep[] = [
    ...plan.intro.map((card) => ({
      key: `intro-${card.id}`,
      kind: 'intro' as const,
      card,
    })),
    ...plan.reviews.map((card) => ({
      key: `review-${card.id}`,
      kind: 'review' as const,
      card,
    })),
    ...plan.questions.map((question) => ({
      key: `question-${question.id}`,
      kind: 'question' as const,
      question,
    })),
  ]

  const boxes: Record<number, number> = {}
  for (const card of plan.reviews) boxes[card.id] = card.box

  return {
    queue,
    index: 0,
    revealed: false,
    promo: null,
    boxes,
    firstTry: {},
    graded: [],
    introduced: [],
    answered: [],
    requeued: [],
    done: queue.length === 0,
  }
}

function advance(state: SessionState, extra: Partial<SessionState> = {}): SessionState {
  const next = state.index + 1
  const queue = extra.queue ?? state.queue
  return {
    ...state,
    ...extra,
    revealed: false,
    promo: null,
    ...(next >= queue.length ? { done: true } : { index: next }),
  }
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  const step = currentStep(state)

  switch (action.type) {
    // Używane też przez „popraw wpadki": ta sama maszyna, plan zawężony do
    // kart, które poszły źle.
    case 'init':
      return initSession(action.plan)

    case 'reveal':
      return state.revealed ? state : { ...state, revealed: true }

    case 'grade': {
      if (!step || step.kind !== 'review' || state.promo) return state
      const id = step.card.id

      // Powtórne podejście: czyste ćwiczenie. Nie rusza pudełka, nie liczy się
      // do wyniku, nie idzie do backendu - komponent sprawdza isFirstAttempt.
      if (!isFirstAttempt(state, id)) return advance(state)

      const from = state.boxes[id] ?? step.card.box
      const to = nextBox(from, action.correct)
      const patch: Partial<SessionState> = {
        boxes: { ...state.boxes, [id]: to },
        firstTry: { ...state.firstTry, [id]: action.correct },
        graded: [...state.graded, id],
      }

      if (action.correct) {
        // Awans dostaje własny takt - w Leitnerze to jedyny sygnał postępu
        // na karcie. Ekran przesuwa dopiero `promoEnd`.
        return { ...state, ...patch, promo: { from, to } }
      }

      // Wpadka wraca na koniec kolejki, ale tylko raz: karta, której nie
      // umiesz trzeci raz, zablokowałaby sesję w nieskończonej pętli.
      const requeue = !state.requeued.includes(id)
      return advance(state, {
        ...patch,
        requeued: requeue ? [...state.requeued, id] : state.requeued,
        queue: requeue
          ? [...state.queue, { ...step, key: `${step.key}-powtórka` }]
          : state.queue,
      })
    }

    case 'promoEnd':
      return state.promo ? advance(state) : state

    case 'introduced': {
      if (!step || step.kind !== 'intro') return state
      return advance(state, { introduced: [...state.introduced, step.card.id] })
    }

    case 'answered': {
      if (!step || step.kind !== 'question') return state
      return advance(state, {
        answered: [...state.answered, { id: step.question.id, solo: action.solo }],
      })
    }

    case 'finish':
      return { ...state, done: true, revealed: false, promo: null }

    default:
      return state
  }
}

export function currentStep(state: SessionState): SessionStep | null {
  return state.done ? null : (state.queue[state.index] ?? null)
}

/** Czy to pierwsze zetknięcie z tą kartą w tej sesji - decyduje o zapisie do API. */
export function isFirstAttempt(state: SessionState, cardId: number): boolean {
  return !(cardId in state.firstTry)
}

export function boxOf(state: SessionState, card: Flashcard): number {
  return state.boxes[card.id] ?? card.box
}

/** Stawki XP z services/gamification.py — rachunek na podsumowaniu ma się zgadzać. */
export const XP = { review: 2, intro: 3, question: 5, solo: 3 } as const

export type SessionSummary = ReturnType<typeof summarize>

export function summarize(state: SessionState) {
  const reviewed = state.graded.length
  const correct = state.graded.filter((id) => state.firstTry[id]).length
  const misses = state.graded.filter((id) => !state.firstTry[id])
  const solo = state.answered.filter((entry) => entry.solo).length
  const mastered = state.graded.filter((id) => state.boxes[id] === MAX_BOX).length

  const xpReviews = reviewed * XP.review
  const xpIntros = state.introduced.length * XP.intro
  const xpQuestions = state.answered.length * XP.question
  const xpSolo = solo * XP.solo

  return {
    reviewed,
    correct,
    correctPct: reviewed === 0 ? 0 : Math.round((correct / reviewed) * 100),
    misses,
    introduced: state.introduced.length,
    answered: state.answered.length,
    solo,
    mastered,
    xpReviews,
    xpIntros,
    xpQuestions,
    xpSolo,
    xpTotal: xpReviews + xpIntros + xpQuestions + xpSolo,
    steps: state.queue.length,
  }
}

/** Postęp na pasku: ile kroków za nami z całej (rosnącej) kolejki. */
export function progressPct(state: SessionState): number {
  if (state.queue.length === 0) return 0
  const seen = state.done ? state.queue.length : state.index
  return Math.round((seen / state.queue.length) * 100)
}
