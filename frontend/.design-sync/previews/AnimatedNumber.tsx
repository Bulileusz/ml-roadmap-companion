import { AnimatedNumber, Card } from 'ml-roadmap-frontend'

/** Licznik dojeżdża sprężyną do wartości; w podglądzie widać stan docelowy. */
export function Wartosc() {
  return (
    <p className="font-display text-ink text-4xl font-extrabold tracking-tight">
      <AnimatedNumber value={2480} />
    </p>
  )
}

/** Z przyrostkiem - procenty i jednostki doklejane bez osobnego elementu. */
export function ZPrzyrostkiem() {
  return (
    <div className="flex items-baseline gap-8">
      <p className="font-display text-ink text-3xl font-extrabold">
        <AnimatedNumber value={41} suffix="%" />
      </p>
      <p className="font-display text-ink text-3xl font-extrabold">
        <AnimatedNumber value={2480} suffix=" XP" />
      </p>
      <p className="font-display text-ink text-3xl font-extrabold">
        <AnimatedNumber value={12} suffix=" dni" />
      </p>
    </div>
  )
}

/** W kafelku wskaźnika - właściwe miejsce: liczba jest treścią, reszta podpisem. */
export function WKafelku() {
  return (
    <Card className="p-4">
      <p className="text-ink-muted text-xs font-medium">Zdobyte XP</p>
      <p className="font-display text-ink mt-1 text-3xl leading-none font-extrabold tracking-tight">
        <AnimatedNumber value={2480} />
      </p>
      <p className="text-ink-faint mt-1.5 text-xs">poziom 7 · 180 z 450 do następnego</p>
    </Card>
  )
}
