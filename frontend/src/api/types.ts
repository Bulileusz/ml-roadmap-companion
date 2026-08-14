import type { components } from './schema'

/**
 * Przyjazne aliasy na modele wygenerowane z OpenAPI.
 *
 * `schema.d.ts` powstaje z `make api-types` i nie jest edytowany ręcznie, więc
 * zmiana pola w backend/api/schemas.py psuje kompilację frontu od razu - a nie
 * dopiero w runtime, na `undefined` w środku widoku.
 */
type Schemas = components['schemas']

export type Dashboard = Schemas['Dashboard']
export type Achievement = Schemas['Achievement']
export type PhaseProgress = Schemas['PhaseProgress']
export type Phase = Schemas['Phase']
export type Task = Schemas['Task']
export type Flashcard = Schemas['Flashcard']
export type Question = Schemas['Question']
export type QuestionWithStats = Schemas['QuestionWithStats']
export type Attempt = Schemas['Attempt']
export type Resource = Schemas['Resource']
export type ActivityEntry = Schemas['ActivityEntry']
export type HeatmapDay = Schemas['HeatmapDay']
export type SessionPlan = Schemas['SessionPlan']
export type Streak = Schemas['Streak']
export type Progression = Schemas['Progression']
export type BoxCount = Schemas['BoxCount']
export type NextTask = Schemas['NextTask']
export type ContentStatus = Schemas['ContentStatus']
export type ContentSyncResult = Schemas['ContentSyncResult']
