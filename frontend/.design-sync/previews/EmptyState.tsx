import { BookMarked, Layers, SquareStack } from 'lucide-react'
import { Button, Card, EmptyState } from 'ml-roadmap-frontend'

/** Brak danych - komunikat spokojny, bez alarmowania. */
export function Podstawowy() {
  return (
    <Card>
      <EmptyState
        title="Ta faza nie ma jeszcze zadań"
        hint="Rozpisz ją na konkretne kroki — pierwszy poniżej."
      />
    </Card>
  )
}

/** Z ikoną i akcją - gdy jest jasne, co użytkownik może zrobić dalej. */
export function ZIkonaIAkcja() {
  return (
    <Card>
      <EmptyState
        icon={<Layers size={28} />}
        title="Żadnych fiszek w rotacji"
        hint="Materiał wjeżdża z katalogu content/ przy starcie backendu."
        action={
          <Button variant="outline" className="mt-1">
            Zsynchronizuj materiał
          </Button>
        }
      />
    </Card>
  )
}

/** Warianty treści - ten sam komponent w trzech różnych widokach. */
export function Warianty() {
  return (
    <div className="space-y-3">
      <Card>
        <EmptyState icon={<SquareStack size={24} />} title="Bank pytań jest pusty" />
      </Card>
      <Card>
        <EmptyState
          icon={<BookMarked size={24} />}
          title="Brak zapisanych materiałów"
          hint="Linki do kursów i artykułów lądują tutaj."
        />
      </Card>
    </div>
  )
}
