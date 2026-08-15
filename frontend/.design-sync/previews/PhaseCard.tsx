import { PhaseCard } from 'ml-roadmap-frontend'

import { PHASE_DONE, PHASE_IN_PROGRESS, PHASE_UNTOUCHED } from '../fixtures'

/** Kanoniczne użycie: lista faz roadmapy, każda z własną barwą. */
export function ListaFaz() {
  return (
    <div className="space-y-3">
      <PhaseCard entry={PHASE_DONE} />
      <PhaseCard entry={PHASE_IN_PROGRESS} />
      <PhaseCard entry={PHASE_UNTOUCHED} />
    </div>
  )
}

/** Rozwinięta: lista zadań z checkboxami w barwie fazy i polem dopisania. */
export function Rozwinieta() {
  return <PhaseCard entry={PHASE_IN_PROGRESS} defaultOpen />
}

/** Domknięta faza - pierścień ustępuje miejsca fajce, dochodzi podpis. */
export function Domknieta() {
  return <PhaseCard entry={PHASE_DONE} />
}
