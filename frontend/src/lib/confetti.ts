import confetti from 'canvas-confetti'

/**
 * Confetti racjonowane.
 *
 * Ta sama zasada, którą repo stosowało już do zieleni w motywie terminalowym:
 * akcent użyty wszędzie przestaje cokolwiek znaczyć. Confetti po każdej fiszce
 * to nie nagroda, tylko szum - dlatego wywołania są wyłącznie na zdarzenia,
 * które faktycznie zdarzają się rzadko: domknięta faza, milestone serii, fiszka
 * doprowadzona do ostatniego pudełka, nowy poziom, zamknięta sesja dnia.
 */

const EMBER = ['#fb923c', '#fbbf24', '#f59e0b']
const JEWELS = ['#22d3ee', '#6366f1', '#a855f7', '#ec4899', '#34d399']

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/** Krótki strzał - domknięta sesja dnia, awans fiszki do ostatniego pudełka. */
export function celebrate(colors: string[] = JEWELS) {
  if (reducedMotion()) return
  void confetti({
    particleCount: 70,
    spread: 62,
    startVelocity: 34,
    origin: { y: 0.7 },
    colors,
    disableForReducedMotion: true,
  })
}

/** Duże wydarzenie - domknięta faza roadmapy albo nowy poziom. */
export function celebrateBig() {
  if (reducedMotion()) return
  // Dwa strzały z boków zamiast jednego środkowego: środek zasłania dokładnie
  // to, co użytkownik ma w tym momencie przeczytać.
  for (const x of [0.2, 0.8]) {
    void confetti({
      particleCount: 90,
      spread: 78,
      startVelocity: 42,
      origin: { x, y: 0.65 },
      colors: [...JEWELS, ...EMBER],
      disableForReducedMotion: true,
    })
  }
}

/** Milestone serii dni - ciepła paleta, ta sama co ogień przy liczniku. */
export function celebrateStreak() {
  celebrate(EMBER)
}
