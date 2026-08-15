import { Badge } from 'ml-roadmap-frontend'

/** Domyślnie badge bierze barwę fazy z `--phase`; bez niej - przygaszony atrament. */
export function Domyslny() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>bez kontekstu fazy</Badge>
      <span style={{ '--phase': '#a855f7' } as React.CSSProperties}>
        <Badge>Faza 2</Badge>
      </span>
    </div>
  )
}

/** Barwy faz roadmapy - ta sama paleta co pierścienie i krawędzie kart. */
export function BarwyFaz() {
  const fazy = [
    { code: '0', color: '#22d3ee' },
    { code: '1', color: '#6366f1' },
    { code: '2', color: '#a855f7' },
    { code: '2b', color: '#ec4899' },
    { code: '3', color: '#fb923c' },
    { code: '4', color: '#34d399' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {fazy.map((f) => (
        <Badge key={f.code} color={f.color}>
          Faza {f.code}
        </Badge>
      ))}
    </div>
  )
}

/** Semantyka: pudełko Leitnera, status materiału, typ pytania. */
export function Semantyczne() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="var(--color-success)">opanowane</Badge>
      <Badge color="var(--color-warn)">do powtórki</Badge>
      <Badge color="var(--color-danger)">zaległe</Badge>
      <Badge color="var(--color-info)">pudełko 3</Badge>
      <Badge color="var(--color-ember)">nowe</Badge>
    </div>
  )
}
