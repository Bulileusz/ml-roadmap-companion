import { Badge, Button, Card } from 'ml-roadmap-frontend'

/** Podstawowa powierzchnia: tło, kreska, promień i cień „szkła". */
export function Powierzchnia() {
  return (
    <Card className="p-5">
      <p className="font-display text-ink font-bold">Pudełka Leitnera</p>
      <p className="text-ink-muted mt-1.5 text-sm">
        Fiszka trafia o jedno pudełko wyżej za każdą poprawną odpowiedź i wraca do
        pierwszego przy pomyłce.
      </p>
    </Card>
  )
}

/** Karta z treścią i akcją - najczęstszy układ w aplikacji. */
export function ZAkcja() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-ink font-bold">Powtórki na dziś</p>
          <p className="text-ink-muted mt-1 text-sm">3 fiszki czekają w kolejce.</p>
        </div>
        <Badge color="var(--color-info)">pudełko 2</Badge>
      </div>
      <Button variant="primary" className="mt-4">
        Zacznij powtórki
      </Button>
    </Card>
  )
}

/** Karta w barwie fazy: `--phase` na rodzicu plus `phase-wash` pod spodem. */
export function ZBarwaFazy() {
  return (
    <div style={{ '--phase': '#a855f7' } as React.CSSProperties}>
      <Card className="phase-wash p-5">
        <Badge>Faza 2</Badge>
        <p className="font-display text-ink mt-2 font-bold">Uczenie nadzorowane</p>
        <p className="text-ink-faint mt-1 text-xs">7 z 12 zadań</p>
      </Card>
    </div>
  )
}
