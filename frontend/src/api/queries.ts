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
  BackupImportResult,
  BackupPreview,
  ContentStatus,
  ContentSyncResult,
  Dashboard,
  DayNote,
  Flashcard,
  JournalDay,
  PhaseProgress,
  Question,
  QuestionStats,
  QuestionWithStats,
  Resource,
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
  questions: (phaseId: number) => ['questions', phaseId] as const,
  resources: (phaseId: number) => ['resources', phaseId] as const,
  journal: (days: number) => ['journal', 'days', days] as const,
  content: ['content', 'status'] as const,
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

/** Wszystko, co zmienia stan nauki, wpływa na te widoki. */
function invalidateProgress(client: QueryClient) {
  void client.invalidateQueries({ queryKey: keys.dashboard })
  void client.invalidateQueries({ queryKey: keys.phases })
  void client.invalidateQueries({ queryKey: keys.session })
  void client.invalidateQueries({ queryKey: keys.achievements })
  // Prefiks, nie konkretne okno: dziennik bywa pobrany na 91 dni i na 30,
  // a każde zdarzenie dopisuje się do obu.
  void client.invalidateQueries({ queryKey: ['journal'] })
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

/* ── Bank pytań ─────────────────────────────────────────────────────────────
 * Pytania i materiały pobiera się per faza, w odróżnieniu od fiszek. Tak
 * wygląda kontrakt (`?phase_id=`), bo jedna wspólna lista nie ma odbiorcy:
 * pytanie bez fazy nie mówi, czego dotyczy. Widok trzyma więc wybraną fazę
 * w stanie i to ona jest kluczem cache'u. */

export function useQuestions(phaseId: number, enabled = true) {
  return useQuery({
    queryKey: keys.questions(phaseId),
    queryFn: () => api.get<QuestionWithStats[]>(`/api/questions?phase_id=${phaseId}`),
    enabled,
  })
}

export function useUpdateQuestion(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      question_text?: string
      answer?: string
      question_type?: Question['question_type']
      phase_id?: number | null
    }) => api.patch<Question>(`/api/questions/${id}`, body),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: keys.questions(phaseId) })
      // Przepięcie do innej fazy znika z tej listy i pojawia się w tamtej.
      if (variables.phase_id != null && variables.phase_id !== phaseId) {
        void client.invalidateQueries({ queryKey: keys.questions(variables.phase_id) })
      }
    },
  })
}

export function useDeleteQuestion(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/api/questions/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.questions(phaseId) })
      invalidateProgress(client)
    },
  })
}

/**
 * Podejście zapisane z banku pytań.
 *
 * Osobny hook od `useRecordAttempt` z sesji, i to jest cała różnica: sesja
 * celowo nie unieważnia zapytań, żeby nie przetasować kolejki pod palcami.
 * W bibliotece jest odwrotnie — wskaźnik samodzielności przy pytaniu ma
 * zobaczyć podejście, które właśnie zapisałeś.
 */
export function useAnswerQuestion(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, solo }: { id: number; solo: boolean }) =>
      api.post<QuestionStats>(`/api/questions/${id}/attempts`, {
        solved_independently: solo,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.questions(phaseId) })
      invalidateProgress(client)
    },
  })
}

/* ── Materiały ───────────────────────────────────────────────────────────── */

export function useResources(phaseId: number, enabled = true) {
  return useQuery({
    queryKey: keys.resources(phaseId),
    queryFn: () => api.get<Resource[]>(`/api/resources?phase_id=${phaseId}`),
    enabled,
  })
}

export function useUpdateResource(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      title?: string
      url?: string
      detail?: string
      status?: Resource['status']
      phase_id?: number | null
    }) => api.patch<Resource>(`/api/resources/${id}`, body),
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: keys.resources(phaseId) })
      if (variables.phase_id != null && variables.phase_id !== phaseId) {
        void client.invalidateQueries({ queryKey: keys.resources(variables.phase_id) })
      }
      // Domknięcie materiału trafia do dziennika i daje XP - to już postęp.
      if (variables.status === 'done') invalidateProgress(client)
    },
  })
}

export function useDeleteResource(phaseId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.del(`/api/resources/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.resources(phaseId) })
    },
  })
}

/* ── Dziennik ────────────────────────────────────────────────────────────── */

export function useJournalDays(days: number) {
  return useQuery({
    queryKey: keys.journal(days),
    queryFn: () => api.get<JournalDay[]>(`/api/journal/days?days=${days}`),
  })
}

/** Notatka do dnia. Pusta treść kasuje notatkę - tak samo jak w backendzie. */
export function useSaveDayNote(days: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ day, note }: { day: string; note: string }) =>
      api.put<DayNote>(`/api/journal/days/${day}/note`, { note }),
    onSuccess: (saved) => {
      // Podmiana w cache'u zamiast unieważnienia: notatka nie zmienia niczego
      // poza sobą, a przeładowanie kwartału przerysowałoby cały strumień.
      client.setQueryData<JournalDay[]>(keys.journal(days), (entries) =>
        entries?.map((entry) =>
          entry.day === saved.day ? { ...entry, note: saved.note } : entry,
        ),
      )
    },
  })
}

/* ── Dane ────────────────────────────────────────────────────────────────── */

export function useContentStatus() {
  return useQuery({
    queryKey: keys.content,
    queryFn: () => api.get<ContentStatus>('/api/content/status'),
  })
}

export function useSyncContent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<ContentSyncResult>('/api/content/sync'),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.content })
      void client.invalidateQueries({ queryKey: keys.flashcards })
      void client.invalidateQueries({ queryKey: ['questions'] })
      void client.invalidateQueries({ queryKey: ['resources'] })
      invalidateProgress(client)
    },
  })
}

export function usePreviewBackup() {
  return useMutation({
    mutationFn: (file: File) => api.upload<BackupPreview>('/api/backup/preview', file),
  })
}

export function useImportBackup() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (file: File) =>
      api.upload<BackupImportResult>('/api/backup/import', file),
    // Po podmianie całej bazy nic z cache'u nie jest już prawdą.
    onSuccess: () => void client.invalidateQueries(),
  })
}
