import { Check } from 'lucide-react'
import { ProgressRing } from 'ml-roadmap-frontend'

/** Skala wypełnienia. Łuk zaczyna się u góry - pierścień jest obrócony o -90°. */
export function Wypelnienie() {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {[0, 25, 58, 100].map((pct) => (
        <ProgressRing key={pct} pct={pct}>
          <span className="font-display tabular text-ink text-lg font-bold">{pct}</span>
        </ProgressRing>
      ))}
    </div>
  )
}

/** Rozmiary i grubość kreski - od kafelka wskaźnika po nagłówek karty fazy. */
export function Rozmiary() {
  return (
    <div className="flex flex-wrap items-end gap-5">
      <ProgressRing pct={72} size={40} thickness={4}>
        <span className="font-display tabular text-ink text-[0.6rem] font-bold">72</span>
      </ProgressRing>
      <ProgressRing pct={72} size={52} thickness={5}>
        <span className="font-display tabular text-ink text-xs font-bold">72</span>
      </ProgressRing>
      <ProgressRing pct={72} size={64} thickness={6}>
        <span className="font-display tabular text-ink text-sm font-bold">72</span>
      </ProgressRing>
      <ProgressRing pct={72} size={96} thickness={7}>
        <span className="font-display tabular text-ink text-xl font-bold">72</span>
      </ProgressRing>
    </div>
  )
}

/** Barwa fazy z `--phase` na rodzicu - to samo źródło co badge i krawędź karty. */
export function WBarwieFazy() {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {[
        { code: '0', color: '#22d3ee', pct: 100 },
        { code: '2', color: '#a855f7', pct: 58 },
        { code: '3', color: '#fb923c', pct: 12 },
      ].map((f) => (
        <div key={f.code} style={{ '--phase': f.color } as React.CSSProperties}>
          <ProgressRing pct={f.pct} size={64} thickness={6}>
            {f.pct === 100 ? (
              <Check size={20} strokeWidth={3} style={{ color: f.color }} />
            ) : (
              <span className="font-display tabular text-ink text-sm font-bold">
                {f.pct}
              </span>
            )}
          </ProgressRing>
        </div>
      ))}
    </div>
  )
}

/** Bez dziecka - sam wskaźnik, gdy liczba jest już podpisana obok. */
export function BezSrodka() {
  return (
    <div className="flex items-center gap-5">
      <ProgressRing pct={41} size={56} thickness={6} color="var(--color-info)" />
      <ProgressRing pct={88} size={56} thickness={6} color="var(--color-success)" />
    </div>
  )
}
