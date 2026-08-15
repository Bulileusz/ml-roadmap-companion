import type { ReactNode } from 'react'
import { HotkeyCheatsheet, useHotkeys } from 'ml-roadmap-frontend'

// Ściągawka nie ma własnej treści - czyta rejestr skrótów, ten sam, z którego
// działają klawisze. Pusty rejestr renderuje pusty dialog, więc podgląd musi
// najpierw zarejestrować skróty. To ta sama droga, którą w apce idzie AppShell.
//
// useHotkeys MUSI przyjść z 'ml-roadmap-frontend', nie z '@/lib/hotkeys-context':
// alias wbudowałby drugą kopię modułu, a jej kontekst nie ma nic wspólnego
// z dostawcą siedzącym w bundlu.
const NAWIGACJA = [
  ['g d', 'Start'],
  ['g s', 'Sesja'],
  ['g f', 'Fiszki'],
  ['g p', 'Pytania'],
  ['g j', 'Dziennik'],
] as const

const AKCJE = [
  ['s', 'Zacznij sesję dnia'],
  ['?', 'Ta ściągawka'],
] as const

function ZeSkrotami({ children }: { children: ReactNode }) {
  useHotkeys([
    ...NAWIGACJA.map(([keys, description]) => ({
      keys,
      description,
      group: 'Nawigacja',
      handler: () => {},
    })),
    ...AKCJE.map(([keys, description]) => ({
      keys,
      description,
      group: 'Akcje',
      handler: () => {},
    })),
  ])
  return <>{children}</>
}

/** Otwarta ściągawka - grupy w kolejności rejestracji, nie alfabetycznie. */
export function Otwarta() {
  return (
    <ZeSkrotami>
      {/* Dialog idzie przez portal na <body>, więc bez tła pod spodem karta
          byłaby pustym paskiem, a przyciemnienie nie miałoby czego przyciemniać.
          Ta wysokość to udawana strona, nad którą ściągawka się otwiera. */}
      <div className="min-h-[26rem]">
        <p className="font-display text-ink-muted text-sm font-semibold">
          Dowolny ekran aplikacji
        </p>
        <p className="text-ink-faint mt-1 text-xs">
          Ściągawka otwiera się nad treścią pod klawiszem „?".
        </p>
      </div>
      <HotkeyCheatsheet open onOpenChange={() => {}} />
    </ZeSkrotami>
  )
}
