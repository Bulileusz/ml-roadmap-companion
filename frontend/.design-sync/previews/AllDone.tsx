import { AllDone } from 'ml-roadmap-frontend'

/** Sukces, nie brak danych - zielona kreska i tło odróżniają go od EmptyState. */
export function Podstawowy() {
  return (
    <AllDone
      title="Wszystkie powtórki zrobione"
      hint="Następne fiszki wrócą jutro rano."
    />
  )
}

/** Sam tytuł - gdy podpowiedź nic by nie dodała. */
export function SamTytul() {
  return <AllDone title="Sesja dnia domknięta" />
}

/** Zestawienie stanów końcowych, które w apce wyglądają podobnie i muszą się różnić. */
export function Warianty() {
  return (
    <div className="space-y-3">
      <AllDone title="Wszystkie powtórki zrobione" hint="Następne fiszki wrócą jutro." />
      <AllDone title="Faza domknięta" hint="9 z 9 zadań — czas na następną." />
    </div>
  )
}
