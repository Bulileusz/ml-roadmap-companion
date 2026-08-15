import { Card, Skeleton } from 'ml-roadmap-frontend'

/** Rozmiar w całości z klas - Skeleton nie ma własnych wymiarów. */
export function Ksztalty() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="size-12 rounded-full" />
    </div>
  )
}

/** Szkielet o proporcjach docelowej treści - bez tego układ skacze po wczytaniu. */
export function SzkieletKarty() {
  return (
    <Card className="p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-9 w-64" />
      <Skeleton className="mt-5 h-12 w-full max-w-xs" />
    </Card>
  )
}

/** Wczytywanie rzędu wskaźników - cztery kafelki tej samej wysokości co docelowe. */
export function RzadKafelkow() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[5.5rem]" />
      ))}
    </div>
  )
}
