import { describe, expect, it } from 'vitest'

import type { Flashcard, QuestionWithStats, SessionPlan } from '@/api/types'

import {
  boxOf,
  currentStep,
  initSession,
  isFirstAttempt,
  progressPct,
  sessionReducer,
  summarize,
  type SessionAction,
  type SessionState,
} from './session-machine'

function card(id: number, box = 1, learned = true): Flashcard {
  return {
    id,
    phase_id: 1,
    front: `Przód ${id}`,
    back: `Tył ${id}`,
    box,
    next_review_at: '2026-08-15',
    learned_at: learned ? '2026-08-01 10:00:00' : null,
    own_note: '',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-01 10:00:00',
  }
}

function question(id: number): QuestionWithStats {
  return {
    id,
    phase_id: 1,
    question_text: `Pytanie ${id}`,
    question_type: 'concept',
    answer: 'Odpowiedź',
    created_at: '2026-08-01 10:00:00',
    stats: { independent: 0, total: 0, pct: 0 },
  }
}

function plan(over: Partial<SessionPlan> = {}): SessionPlan {
  return {
    intro: [],
    reviews: [],
    reviews_remaining: 0,
    questions: [],
    phase: { id: 1, code: '2', name: 'Faza 2 - Klasyczne ML', order_index: 1 },
    next_task: null,
    total_steps: 0,
    estimated_minutes: 0,
    ...over,
  }
}

function run(state: SessionState, ...actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state)
}

describe('initSession', () => {
  it('układa kolejkę: powtórki, zapoznania, pytania', () => {
    const state = initSession(
      plan({
        intro: [card(1, 1, false)],
        reviews: [card(2, 3)],
        questions: [question(9)],
      }),
    )

    // Powtórki pierwsze, bo mają termin — gdy urwiesz sesję w połowie, ma być
    // zrobione to, co na dziś przypadało. Zapoznania są uznaniowe.
    expect(state.queue.map((s) => s.kind)).toEqual(['review', 'intro', 'question'])
    expect(state.done).toBe(false)
  })

  it('pusty plan jest od razu domknięty', () => {
    const state = initSession(plan())

    expect(state.done).toBe(true)
    expect(currentStep(state)).toBeNull()
  })

  it('zapamiętuje pudełka kart do powtórki', () => {
    const state = initSession(plan({ reviews: [card(2, 4)] }))

    expect(boxOf(state, card(2, 4))).toBe(4)
  })
})

describe('powtórka', () => {
  const start = () => initSession(plan({ reviews: [card(1, 2), card(2, 1)] }))

  it('trafienie awansuje pudełko i zatrzymuje ekran na takcie awansu', () => {
    const state = run(start(), { type: 'reveal' }, { type: 'grade', correct: true })

    expect(state.promo).toEqual({ from: 2, to: 3 })
    // Ekran NIE przesuwa się sam - czeka na domknięcie taktu.
    expect(currentStep(state)?.key).toBe('review-1')

    const after = sessionReducer(state, { type: 'promoEnd' })
    expect(after.promo).toBeNull()
    expect(currentStep(after)?.key).toBe('review-2')
  })

  it('wpadka nie ma taktu awansu i przesuwa od razu', () => {
    const state = run(start(), { type: 'reveal' }, { type: 'grade', correct: false })

    // Zatrzymywanie użytkownika na sekundę przy „3 → 1" to takt kary.
    expect(state.promo).toBeNull()
    expect(currentStep(state)?.key).toBe('review-2')
    expect(state.boxes[1]).toBe(1)
  })

  it('wpadka dopisuje kartę na koniec kolejki', () => {
    const state = run(start(), { type: 'reveal' }, { type: 'grade', correct: false })

    expect(state.queue.map((s) => s.key)).toEqual([
      'review-1',
      'review-2',
      'review-1-powtórka',
    ])
  })

  it('karta wraca tylko raz, choćbyś oblał ją znowu', () => {
    let state = run(start(), { type: 'reveal' }, { type: 'grade', correct: false })
    // Przechodzimy przez drugą kartę do powtórki pierwszej.
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })
    state = sessionReducer(state, { type: 'promoEnd' })
    expect(currentStep(state)?.key).toBe('review-1-powtórka')

    state = run(state, { type: 'reveal' }, { type: 'grade', correct: false })

    // Bez tego ogranicznika karta, której nie umiesz, zapętla sesję.
    expect(state.queue).toHaveLength(3)
    expect(state.done).toBe(true)
  })

  it('powtórne podejście nie rusza pudełka ani wyniku', () => {
    let state = run(start(), { type: 'reveal' }, { type: 'grade', correct: false })
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })
    state = sessionReducer(state, { type: 'promoEnd' })

    // Odpowiedź widziałeś minutę temu - zaliczenie jej nie jest wyciąganiem
    // z pamięci, więc nie awansuje pudełka i nie liczy się do statystyki.
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })

    expect(state.boxes[1]).toBe(1)
    expect(state.firstTry[1]).toBe(false)
    expect(state.graded).toEqual([1, 2])
    expect(state.promo).toBeNull()
  })

  it('isFirstAttempt rozstrzyga, co wysłać do backendu', () => {
    const fresh = start()
    expect(isFirstAttempt(fresh, 1)).toBe(true)

    const graded = run(fresh, { type: 'reveal' }, { type: 'grade', correct: false })
    expect(isFirstAttempt(graded, 1)).toBe(false)
  })

  it('ocena bez odsłonięcia i w trakcie taktu nie przechodzi', () => {
    const state = start()
    // Klawiatura jest zablokowana w UI, ale reduktor też ma się bronić.
    const duringPromo = run(
      state,
      { type: 'reveal' },
      { type: 'grade', correct: true },
      { type: 'grade', correct: true },
    )

    expect(duringPromo.graded).toEqual([1])
  })
})

describe('zapoznanie i pytania', () => {
  it('zapoznanie nie ma oceny, tylko przejście dalej', () => {
    const state = initSession(plan({ intro: [card(1, 1, false)] }))

    const after = sessionReducer(state, { type: 'introduced' })

    expect(after.introduced).toEqual([1])
    expect(after.done).toBe(true)
  })

  it('pytanie zapisuje, czy poszło samodzielnie', () => {
    const state = initSession(plan({ questions: [question(9), question(10)] }))

    const after = run(
      state,
      { type: 'answered', solo: true },
      { type: 'answered', solo: false },
    )

    expect(after.answered).toEqual([
      { id: 9, solo: true },
      { id: 10, solo: false },
    ])
    expect(after.done).toBe(true)
  })

  it('akcja niepasująca do bieżącego kroku jest ignorowana', () => {
    const state = initSession(plan({ reviews: [card(1)] }))

    expect(sessionReducer(state, { type: 'introduced' })).toBe(state)
    expect(sessionReducer(state, { type: 'answered', solo: true })).toBe(state)
  })
})

describe('podsumowanie', () => {
  it('liczy XP tymi samymi stawkami co backend', () => {
    let state = initSession(
      plan({
        intro: [card(1, 1, false)],
        reviews: [card(2, 1), card(3, 4)],
        questions: [question(9)],
      }),
    )
    // Kolejka: powtórka 2, powtórka 3, zapoznanie 1, pytanie 9.
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })
    state = sessionReducer(state, { type: 'promoEnd' })
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: false })
    state = sessionReducer(state, { type: 'introduced' })
    state = sessionReducer(state, { type: 'answered', solo: true })
    // Karta 3 wróciła na koniec kolejki.
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })

    const summary = summarize(state)

    expect(summary.introduced).toBe(1)
    expect(summary.reviewed).toBe(2)
    expect(summary.correct).toBe(1)
    expect(summary.correctPct).toBe(50)
    expect(summary.misses).toEqual([3])
    expect(summary.answered).toBe(1)
    expect(summary.solo).toBe(1)
    // 2 powtórki x2 + 1 zapoznanie x3 + 1 pytanie x5 + premia x3
    expect(summary.xpReviews).toBe(4)
    expect(summary.xpIntros).toBe(3)
    expect(summary.xpQuestions).toBe(5)
    expect(summary.xpSolo).toBe(3)
    expect(summary.xpTotal).toBe(15)
  })

  it('nie płaci za powtórne podejścia', () => {
    let state = initSession(plan({ reviews: [card(1, 1)] }))
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: false })
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })

    // Dwa kliknięcia, jedna zapisana powtórka - inaczej dałoby się nabijać XP
    // celowym oblewaniem.
    expect(summarize(state).xpReviews).toBe(2)
  })

  it('liczy karty doprowadzone do ostatniego pudełka', () => {
    let state = initSession(plan({ reviews: [card(1, 4), card(2, 1)] }))
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })
    state = sessionReducer(state, { type: 'promoEnd' })
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })

    expect(summarize(state).mastered).toBe(1)
  })

  it('pusta sesja nie dzieli przez zero', () => {
    expect(summarize(initSession(plan())).correctPct).toBe(0)
  })
})

describe('progressPct', () => {
  it('rośnie z krokami i domyka się na końcu', () => {
    let state = initSession(plan({ reviews: [card(1), card(2)] }))
    expect(progressPct(state)).toBe(0)

    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })
    state = sessionReducer(state, { type: 'promoEnd' })
    expect(progressPct(state)).toBe(50)

    state = run(state, { type: 'reveal' }, { type: 'grade', correct: true })
    state = sessionReducer(state, { type: 'promoEnd' })
    expect(progressPct(state)).toBe(100)
  })

  it('cofa się, gdy wpadka dopisze pracy - i to jest uczciwe', () => {
    let state = initSession(plan({ reviews: [card(1), card(2)] }))
    state = run(state, { type: 'reveal' }, { type: 'grade', correct: false })

    // Był 1 z 2 (50%), doszła trzecia karta, więc jest 1 z 3 (33%).
    expect(progressPct(state)).toBe(33)
  })
})
