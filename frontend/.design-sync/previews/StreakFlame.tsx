import { Card, StreakFlame } from 'ml-roadmap-frontend'

import { STREAK_ALIVE, STREAK_COLD } from '../fixtures'

/** Seria żywa - płomień z gradientem, pulsuje wolno w realnej apce. */
export function SeriaZywa() {
  return <StreakFlame streak={STREAK_ALIVE} />
}

/** Seria zerwana - ten sam kształt, wygaszony na kolor kreski. Bez wyrzutów. */
export function SeriaZerwana() {
  return <StreakFlame streak={STREAK_COLD} />
}

/** Obok siebie - różnica stanów jest treścią tego komponentu. */
export function Porownanie() {
  return (
    <Card className="flex items-center gap-10 p-5">
      <StreakFlame streak={STREAK_ALIVE} />
      <StreakFlame streak={STREAK_COLD} />
    </Card>
  )
}
