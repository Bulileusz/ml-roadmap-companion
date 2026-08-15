import { Card, LevelBar, StreakFlame } from 'ml-roadmap-frontend'

import { PROGRESSION, STREAK_ALIVE } from '../fixtures'

/** Poziom i pasek XP - wypełnienie w gradiencie ognia, tej samej rodziny co seria. */
export function Poziom() {
  return <LevelBar progression={PROGRESSION} />
}

/** Świeży poziom kontra prawie następny - skrajne wartości paska. */
export function Skrajne() {
  return (
    <div className="space-y-6">
      <LevelBar
        progression={{ xp: 1200, level: 5, xp_into_level: 0, xp_for_next_level: 350, pct: 0 }}
      />
      <LevelBar
        progression={{ xp: 3390, level: 9, xp_into_level: 480, xp_for_next_level: 500, pct: 96 }}
      />
    </div>
  )
}

/** Nagłówek strony startowej: pasek poziomu obok licznika serii. */
export function WNaglowku() {
  return (
    <Card className="flex items-center gap-6 p-5">
      <div className="w-full max-w-[16rem]">
        <LevelBar progression={PROGRESSION} />
      </div>
      <StreakFlame streak={STREAK_ALIVE} />
    </Card>
  )
}
