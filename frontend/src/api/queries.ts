import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useCallback } from 'react'

import { api } from './client'
import type {
  Achievement,
  Dashboard,
  Flashcard,
  PhaseProgress,
  QuestionStats,
  SessionPlan,
  Task,
} from './types'

export const keys = {
  dashboard: ['dashboard'] as const,
  achievements: ['achievements'] as const,
  phases: ['phases'] as const,
  tasks: (phaseId: number) => ['phases', phaseId, 'tasks'] as const,
  flashcards: ['flashcards'] as const,
  session: ['session', 'today'] as const,
}

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.get<Dashboard>('/api/dashboard'),
  })
}

export function useAchievements() {
  return useQuery({
    queryKey: keys.achievements,
    queryFn: () => api.get<Achievement[]>('/api/achievements'),
  })
}

export function usePhases() {
  return useQuery({
    queryKey: keys.phases,
    queryFn: () => api.get<PhaseProgress[]>('/api/phases'),
  })
}

export function usePhaseTasks(phaseId: number, enabled = true) {
  return useQuery({
    queryKey: keys.tasks(phaseId),
    queryFn: () => api.get<Task[]>(`/api/phases/${phaseId}/tasks`),
    enabled,
  })
}

export function useSessionPlan() {
  return useQuery({
    queryKey: keys.session,
    queryFn: () => api.get<SessionPlan>('/api/session/today'),
  })
}

/** Wszystko, co zmienia stan nauki, wpływa na te trzy widoki. */
function invalidateProgress(client: QueryClient) {
  void client.invalidateQueries({ queryKey: keys.dashboard })
  void client.invalidateQueries({ queryKey: keys.phases })
  void client.invalidateQueries({ queryKey: keys.session })
  void client.invalidateQueries({ queryKey: keys.achievements })
}

/**
 * Odhaczenie zadania - z natychmiastową podmianą w cache'u.
 *
 * To jest cała różnica między tą apką a poprzednią: Streamlit przeliczał całą
 * stronę po każdym kliknięciu checkboxa, więc odhaczenie zadania było operacją
 * na pół sekundy z przeskokiem układu. Tutaj checkbox zmienia się natychmiast,
 * a pasek fazy rusza w tym samym renderze; sieć dogania w tle, a błąd cofa
 * zmianę do stanu z serwera.
 */
export function useToggleTask(phaseId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isDone }: { id: number; isDone: boolean }) =>
      api.patch<Task>(`/api/tasks/${id}`, { is_done: isDone }),

    onMutate: async ({ id, isDone }) => {
      await client.cancelQueries({ queryKey: keys.tasks(phaseId) })
      const previousTasks = client.getQueryData<Task[]>(keys.tasks(phaseId))
      const previousPhases = client.getQueryData<PhaseProgress[]>(keys.phases)

      client.setQueryData<Task[]>(keys.tasks(phaseId), (tasks) =>
        tasks?.map((task) => (task.id === id ? { ...task, is_done: isDone } : task)),
      )
      // Licznik fazy przeliczamy lokalnie, żeby pierścień ruszył w tym samym
      // renderze co checkbox - inaczej liczba i pasek rozjeżdżają się na moment
      // i widać, że coś dogania.
      client.setQueryData<PhaseProgress[]>(keys.phases, (phases) =>
        phases?.map((entry) => {
          if (entry.phase.id !== phaseId) return entry
          const done = entry.done + (isDone ? 1 : -1)
          return {
            ...entry,
            done,
            pct: entry.total === 0 ? 0 : (done / entry.total) * 100,
          }
        }),
      )

      return { previousTasks, previousPhases }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        client.setQueryData(keys.tasks(phaseId), context.previousTasks)
      }
      if (context?.previousPhases) {
        client.setQueryData(keys.phases, context.previousPhases)
      }
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: keys.tasks(phaseId) })
      invalidateProgress(client)
    },
  })
}

/**
 * Mutacje sesji — świadomie BEZ unieważniania zapytań.
 *
 * `/api/session/today` jest przeliczane przy każdym pobraniu, więc unieważnienie
 * go w środku sesji przetasowałoby kolejkę pod palcami: karta oceniona przed
 * chwilą wypadłaby z planu, a licznik „3 z 12" zmienił się w trakcie.
 * Kolejka jest snapshotem wziętym raz na starcie; reszta widoków dogania
 * dopiero na `finishSession()`.
 */
export function useReviewCard() {
  return useMutation({
    mutationFn: ({ id, correct }: { id: number; correct: boolean }) =>
      api.post<Flashcard>(`/api/flashcards/${id}/review`, { correct }),
  })
}

export function useIntroduceCard() {
  return useMutation({
    mutationFn: (id: number) => api.post<Flashcard>(`/api/flashcards/${id}/intro`),
  })
}

export function useSaveOwnNote() {
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.patch<Flashcard>(`/api/flashcards/${id}`, { own_note: note }),
  })
}

export function useRecordAttempt() {
  return useMutation({
    mutationFn: ({ id, solo }: { id: number; solo: boolean }) =>
      api.post<QuestionStats>(`/api/questions/${id}/attempts`, {
        solved_independently: solo,
      }),
  })
}

export function useFlashcards() {
  return useQuery({
    queryKey: keys.flashcards,
    queryFn: () => api.get<Flashcard[]>('/api/flashcards'),
  })
}

/** Edycja fiszki w bibliotece. `phase_id: null` odpina ją od fazy. */
export function useUpdateFlashcard() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      front?: string
      back?: string
      own_note?: string
      phase_id?: number | null
    }) => api.patch<Flashcard>(`/api/flashcards/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.flashcards })
      invalidateProgress(client)
    },
  })
}

export function useDeleteFlashcard() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/api/flashcards/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.flashcards })
      invalidateProgress(client)
    },
  })
}

/** Domknięcie sesji: dopiero teraz reszta apki ma prawo zobaczyć nowy stan. */
export function useFinishSession() {
  const client = useQueryClient()
  return useCallback(() => invalidateProgress(client), [client])
}

export function useCreateTask(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      api.post<Task>('/api/tasks', { phase_id: phaseId, title }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tasks(phaseId) })
      invalidateProgress(client)
    },
  })
}

export function useUpdateTask(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; notes?: string }) =>
      api.patch<Task>(`/api/tasks/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tasks(phaseId) })
    },
  })
}

export function useDeleteTask(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/api/tasks/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.tasks(phaseId) })
      invalidateProgress(client)
    },
  })
}
