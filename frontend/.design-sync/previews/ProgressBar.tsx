import { Card, ProgressBar } from 'ml-roadmap-frontend'

/** Skala wypełnienia - ten sam pasek przy różnych wartościach. */
export function Wypelnienie() {
  return (
    <div className="space-y-4">
      {[0, 25, 58, 100].map((pct) => (
        <div key={pct}>
          <p className="text-ink-faint mb-1.5 text-xs">{pct}%</p>
          <ProgressBar pct={pct} />
        </div>
      ))}
    </div>
  )
}

/** Barwa z `--phase` na rodzicu - pasek dziedziczy tożsamość fazy. */
export function WBarwieFazy() {
  return (
    <div className="space-y-4">
      {[
        { name: 'Python i narzędzia', color: '#22d3ee', pct: 100 },
        { name: 'Uczenie nadzorowane', color: '#a855f7', pct: 58 },
        { name: 'Sieci neuronowe', color: '#fb923c', pct: 12 },
      ].map((f) => (
        <div key={f.name} style={{ '--phase': f.color } as React.CSSProperties}>
          <p className="text-ink-muted mb-1.5 text-xs">{f.name}</p>
          <ProgressBar pct={f.pct} />
        </div>
      ))}
    </div>
  )
}

/** W karcie, tam gdzie pierścień byłby przesadą. */
export function WKarcie() {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-ink text-sm font-medium">Postęp roadmapy</p>
        <p className="text-ink-faint tabular text-xs">41%</p>
      </div>
      <ProgressBar pct={41} color="var(--color-info)" />
    </Card>
  )
}
