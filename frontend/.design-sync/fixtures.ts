// Dane domenowe dla kart podglądu.
//
// Jedno miejsce, bo te same fazy i ten sam plan dnia wracają w kilku podglądach,
// a rozjechane liczby między kartami czytają się jak błąd komponentu.
// Treść jest prawdziwa - to realne kroki tej roadmapy, nie „Lorem ipsum":
// karty ogląda człowiek, a agent projektowy bierze z nich wzorzec kompozycji.

import type {
  PhaseProgress,
  Progression,
  SessionPlan,
  Streak,
  Task,
} from '@/api/types'

export const PHASE_IN_PROGRESS: PhaseProgress = {
  phase: {
    id: 3,
    code: '2',
    name: 'Faza 2 - Uczenie nadzorowane',
    order_index: 3,
  },
  done: 7,
  total: 12,
  pct: 58.3,
}

export const PHASE_DONE: PhaseProgress = {
  phase: {
    id: 1,
    code: '0',
    name: 'Faza 0 - Python i narzędzia',
    order_index: 1,
  },
  done: 9,
  total: 9,
  pct: 100,
}

export const PHASE_UNTOUCHED: PhaseProgress = {
  phase: {
    id: 5,
    code: '3',
    name: 'Faza 3 - Sieci neuronowe i PyTorch',
    order_index: 5,
  },
  done: 0,
  total: 14,
  pct: 0,
}

/** Zadania fazy 2 - dosiewane do cache'u zapytań w preview-provider. */
export const TASKS_PHASE_2: Task[] = [
  {
    id: 21,
    phase_id: 3,
    title: 'Regresja liniowa od zera w NumPy',
    notes: '',
    is_done: true,
    order_index: 1,
  },
  {
    id: 22,
    phase_id: 3,
    title: 'Regularyzacja: ridge, lasso i po co to komu',
    notes: '',
    is_done: true,
    order_index: 2,
  },
  {
    id: 23,
    phase_id: 3,
    title: 'Walidacja krzyżowa bez wycieku danych',
    notes: '',
    is_done: false,
    order_index: 3,
  },
  {
    id: 24,
    phase_id: 3,
    title: 'Macierz pomyłek i kiedy accuracy kłamie',
    notes: '',
    is_done: false,
    order_index: 4,
  },
]

export const STREAK_ALIVE: Streak = { current: 12, longest: 31, active_days: 96 }
export const STREAK_COLD: Streak = { current: 0, longest: 31, active_days: 96 }

export const PROGRESSION: Progression = {
  xp: 2480,
  level: 7,
  xp_into_level: 180,
  xp_for_next_level: 450,
  pct: 40,
}

function card(id: number, front: string, back: string, box: number) {
  return {
    id,
    phase_id: 3,
    front,
    back,
    box,
    next_review_at: '2026-08-15T06:00:00',
    learned_at: '2026-08-01T19:12:00',
    own_note: '',
    created_at: '2026-07-20T18:00:00',
    updated_at: '2026-08-01T19:12:00',
  }
}

export const SESSION_PLAN: SessionPlan = {
  questions_gate: null,
  intro: [
    card(101, 'Bias-variance tradeoff', 'Im prostszy model, tym większe obciążenie…', 1),
    card(102, 'Regularyzacja L1 vs L2', 'L1 zeruje wagi, L2 je ściska…', 1),
  ],
  reviews: [
    card(88, 'Czym jest walidacja krzyżowa?', 'Dzielimy zbiór na k części…', 3),
    card(89, 'Precision vs recall', 'Precision: ile z wskazanych trafionych…', 2),
    card(90, 'Co to jest wyciek danych?', 'Gdy do treningu trafia informacja…', 4),
  ],
  reviews_remaining: 6,
  questions: [],
  phase: PHASE_IN_PROGRESS.phase,
  briefing: {
    task: {
      id: 23,
      phase_id: 3,
      title: 'Walidacja krzyżowa bez wycieku danych',
      phase_name: 'Faza 2 - Uczenie nadzorowane',
      notes:
        'Zbuduj pipeline, w którym skalowanie liczy się wewnątrz każdego foldu, ' +
        'nie przed podziałem. Porównaj wynik z wersją z wyciekiem.\n' +
        'Gotowe, gdy różnica accuracy między wersjami jest widoczna i umiesz ją wyjaśnić.',
    },
    materials: [
      {
        id: 41,
        phase_id: 3,
        title: 'scikit-learn: walidacja krzyżowa',
        url: 'https://scikit-learn.org/stable/modules/cross_validation.html',
        kind: 'docs',
        detail: '',
        status: 'in_progress',
        order_index: 0,
      },
      {
        id: 42,
        phase_id: 3,
        title: 'scikit-learn: Pipeline',
        url: 'https://scikit-learn.org/stable/modules/compose.html',
        kind: 'docs',
        detail: '',
        status: 'todo',
        order_index: 1,
      },
    ],
    done: 2,
    total: 6,
  },
  next_task: {
    id: 23,
    phase_id: 3,
    title: 'Walidacja krzyżowa bez wycieku danych',
    phase_name: 'Faza 2 - Uczenie nadzorowane',
    notes: 'Zbuduj pipeline bez wycieku danych.',
  },
  total_steps: 6,
  estimated_minutes: 25,
}

/** Nic do zrobienia - osobny stan, bo wygląda zupełnie inaczej niż plan z krokami. */
export const SESSION_PLAN_EMPTY: SessionPlan = {
  questions_gate: null,
  intro: [],
  reviews: [],
  reviews_remaining: 0,
  questions: [],
  phase: PHASE_DONE.phase,
  // Domknięta roadmapa: nie ma czego zapowiedzieć, więc odprawy też nie ma.
  briefing: null,
  next_task: null,
  total_steps: 0,
  estimated_minutes: 0,
}
