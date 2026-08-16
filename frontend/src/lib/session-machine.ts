import type { Briefing, Flashcard, QuestionWithStats, SessionPlan } from '@/api/types'

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
  | { key: string; kind: 'briefing'; briefing: Briefing }
  | { key: string; kind: 'intro'; card: Flashcard }
  | { key: string; kind: 'review'; card: Flashcard }
  | { key: string; kind: 'question'; question: QuestionWithStats }

export type SessionState = {
  queue: SessionStep[]
  index: number
  revealed: boolean
  /** Takt awansu pudełka: trzyma ekran przez chwilę po trafieniu. */
  promo: { from: number; to: number } | null
  /** cardId -> aktualne pudełko, aktualizowane tylko przy pierwszym podejściu. */
  boxes: Record<number, number>
  /** cardId -> pudełko na wejściu. Potrzebne, żeby policzyć awanse: karta
   *  w pudełku 5 zaliczona poprawnie zostaje w piątym, więc trafienie nie
   *  zawsze znaczy awans. */
  initialBoxes: Record<number, number>
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
  | { type: 'briefed' }
  | { type: 'reveal' }
  | { type: 'grade'; correct: boolean }
  | { type: 'promoEnd' }
  | { type: 'introduced' }
  | { type: 'answered'; solo: boolean }
  | { type: 'finish' }

export function initSession(plan: SessionPlan): SessionState {
  // Odprawa otwiera wieczór: mówi, co dziś robisz i z czego. Jest przed
  // powtórkami mimo że nie ma terminu, bo to zapowiedź całego wieczoru, a nie
  // jeden z jego kroków - i musi paść, zanim wsiąkniesz w karty. Kosztuje
  // jedno kliknięcie i nic nie zapisuje, więc nie zjada budżetu powtórek.
  //
  // Dalej powtórki, bo one JEDNE mają termin. Zapoznania są uznaniowe, więc gdy
  // urwiesz sesję w połowie, ma być zrobione to, co na dziś przypadało.
  // Pytania na końcu - wymagają złożenia kilku rzeczy naraz.
  const queue: SessionStep[] = [
    ...(plan.briefing
      ? [
          {
            key: `briefing-${plan.briefing.task.id}`,
            kind: 'briefing' as const,
            briefing: plan.briefing,
          },
        ]
      : []),
    ...plan.reviews.map((card) => ({
      key: `review-${card.id}`,
      kind: 'review' as const,
      card,
    })),
    ...plan.intro.map((card) => ({
      key: `intro-${card.id}`,
      kind: 'intro' as const,
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
    initialBoxes: { ...boxes },
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

    // Odprawa niczego nie zapisuje: zadanie roadmapy odhaczasz na Mapie, po
    // faktycznej robocie, a nie klikając "dalej" na ekranie, który je zapowiada.
    case 'briefed':
      return !step || step.kind !== 'briefing' ? state : advance(state)

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

/**
 * „nowa karta 2 z 5" - która to karta zapoznawcza z tych zaplanowanych na dziś.
 *
 * Limit nowych kart na sesję jest realną decyzją (inaczej wgranie stu fiszek
 * z content/ dałoby sto pierwszych kontaktów w jeden wieczór), więc ma być
 * widoczny, a nie tylko opisany.
 */
export function introQuota(state: SessionState, cardId: number) {
  const intros = state.queue.filter((step) => step.kind === 'intro')
  return {
    index:
      intros.findIndex((step) => step.kind === 'intro' && step.card.id === cardId) + 1,
    total: intros.length,
  }
}

/** „Pytanie 2 z 3" - krok pytań ma własny licznik, bo to osobny etap sesji. */
export function questionQuota(state: SessionState, questionId: number) {
  const questions = state.queue.filter((step) => step.kind === 'question')
  return {
    index:
      questions.findIndex(
        (step) => step.kind === 'question' && step.question.id === questionId,
      ) + 1,
    total: questions.length,
  }
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
  const promoted = state.graded.filter(
    (id) => (state.boxes[id] ?? 0) > (state.initialBoxes[id] ?? 0),
  ).length

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
    promoted,
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
