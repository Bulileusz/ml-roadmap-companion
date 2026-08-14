import {
  Code2,
  Flame,
  HardHat,
  ScatterChart,
  Sigma,
  Trees,
  type LucideIcon,
} from 'lucide-react'

/**
 * Tożsamość wizualna faz roadmapy.
 *
 * Barwy idą przez widmo w kolejności faz, więc postęp da się zobaczyć bez
 * czytania: „jestem w fioletowej" jest realną orientacją, a nie ozdobą. Kolor
 * fazy trafia potem na pierścień postępu, lewą krawędź karty, badge i wash pod
 * kartą - zawsze przez zmienną CSS `--phase`, nigdy przez klasę Tailwinda per
 * faza, bo fazy pochodzą z bazy i można dodać nową.
 *
 * Ikony są przymrużeniem oka tam, gdzie się da: pochodnia dla PyTorcha, las dla
 * ensemble, kask dla projektu domenowego.
 */
export type PhaseVisual = {
  color: string
  icon: LucideIcon
}

const PHASE_VISUALS: Record<string, PhaseVisual> = {
  '0': { color: '#22d3ee', icon: Code2 },
  '1': { color: '#6366f1', icon: Sigma },
  '2': { color: '#a855f7', icon: ScatterChart },
  '2b': { color: '#ec4899', icon: Trees },
  '3': { color: '#fb923c', icon: Flame },
  '4': { color: '#34d399', icon: HardHat },
}

const FALLBACK: PhaseVisual = { color: '#8b94a8', icon: Code2 }

export function phaseVisual(code: string | undefined): PhaseVisual {
  return (code && PHASE_VISUALS[code]) || FALLBACK
}

/**
 * Nazwy faz z seeda mają postać „Faza 2b - Ensemble methods”. W nagłówkach
 * chcemy sam temat, bo numer fazy jest już widoczny w badge'u obok - powtarzanie
 * go zjada miejsce i czyta się jak zacinająca płyta.
 */
export function phaseTopic(name: string): string {
  const separator = name.indexOf(' - ')
  return separator === -1 ? name : name.slice(separator + 3)
}
