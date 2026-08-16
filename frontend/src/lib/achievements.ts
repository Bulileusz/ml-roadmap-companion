import type { Achievement } from '@/api/types'

/**
 * Które osiągnięcia wpadły od ostatniego spojrzenia.
 *
 * Backend celowo nie ma stanu „widziane": mówi tylko, które osiągnięcia są
 * zdobyte (services/gamification.py), bo cała gamifikacja jest funkcją historii
 * z activity_log, a nie licznikiem, który da się rozjechać. Wiedza o tym, co
 * użytkownik już widział, jest własnością tej przeglądarki i tu zostaje.
 */

const STORAGE_KEY = 'ml-roadmap:widziane-osiagniecia'

/**
 * Zapamiętane id. `null` znaczy „nigdy nic nie zapisano", a to co innego niż
 * pusta lista: przy pierwszym uruchomieniu nie ma z czym porównywać.
 */
export function readSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : null
  } catch {
    // Prywatne okno, wyłączony storage, uszkodzony wpis - brak pamięci jest
    // stanem obsługiwanym, nie awarią. Najwyżej celebracja się nie odpali.
    return null
  }
}

export function writeSeen(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // jw. - zapis jest miły, nie konieczny
  }
}

export function unlockedIds(achievements: Achievement[]): string[] {
  return achievements.filter((item) => item.unlocked).map((item) => item.id)
}

/**
 * Osiągnięcia zdobyte od ostatniego zapisu.
 *
 * Przy pierwszym uruchomieniu (`seen === null`) zwracamy pustą listę, mimo że
 * technicznie „wszystkie są nowe": inaczej ktoś, kto uczy się od miesiąca
 * i pierwszy raz odpalił nową wersję apki, dostałby na twarz osiem naraz.
 * Pierwsze spojrzenie ma zasiać pamięć, nie świętować.
 */
export function freshlyUnlocked(
  seen: string[] | null,
  achievements: Achievement[],
): Achievement[] {
  if (seen === null) return []
  const known = new Set(seen)
  return achievements.filter((item) => item.unlocked && !known.has(item.id))
}

/**
 * „phase-2b" → „2b"; dla pozostałych osiągnięć fazy nie ma.
 *
 * Kod fazy siedzi w id, bo backend buduje je z kodu (`f"phase-{code}"`
 * w services/gamification.py). To jedyne miejsce na froncie, które o tym wie -
 * dzięki temu osiągnięcie fazy może nieść jej barwę, tak jak wszystko inne
 * przypisane do fazy w tej apce.
 */
export function phaseCodeOf(id: string): string | undefined {
  return id.startsWith('phase-') ? id.slice('phase-'.length) : undefined
}

/**
 * Czy to jest duże wydarzenie - domknięta faza albo nowy poziom.
 *
 * Rozróżnienie jest po to, żeby confetti zostało racjonowane (lib/confetti.ts):
 * setna powtórka to miły drobiazg, domknięta faza to koniec etapu roadmapy.
 */
export function isBigDeal(achievements: Achievement[]): boolean {
  return achievements.some(
    (item) => item.id.startsWith('phase-') || item.id.startsWith('level-'),
  )
}
