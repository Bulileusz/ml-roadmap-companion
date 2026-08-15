import { SessionHero } from 'ml-roadmap-frontend'

import { SESSION_PLAN, SESSION_PLAN_EMPTY } from '../fixtures'

/** Plan dnia z krokami - pierwsza rzecz na ekranie startowym. */
export function PlanDnia() {
  return <SessionHero plan={SESSION_PLAN} />
}

/** Nic w kolejce. Osobny stan i osobny ton - to sukces, nie brak danych. */
export function NaDzisCzysto() {
  return <SessionHero plan={SESSION_PLAN_EMPTY} />
}

/** Bez planu (dane w drodze) - szkielet zamiast skoku układu. */
export function Wczytywanie() {
  return <SessionHero plan={undefined} />
}
