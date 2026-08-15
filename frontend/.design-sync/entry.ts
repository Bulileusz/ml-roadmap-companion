// Wejście bundla dla design-sync.
//
// Ten front jest aplikacją, nie biblioteką: package.json nie ma `exports`,
// a dist/ to zbudowana strona, nie dist biblioteki. Konwerter potrzebuje jednego
// modułu, który wystawia komponenty - i musi to być plik pisany ręcznie, bo
// automatyczne `export * from` po całym src/ wciągnęłoby main.tsx, który przy
// imporcie montuje aplikację i rzuca „Brak #root w index.html".
//
// Kolejność bez znaczenia; brak eksportów domyślnych, więc nazwy nie kolidują.

export * from '@/components/ui/primitives'
export * from '@/components/ui/ProgressRing'
export * from '@/components/Progression'
export * from '@/components/HotkeyCheatsheet'
export * from '@/components/AppShell'

// Rejestr skrótów. Nie komponenty (nazwy na `use*` są pomijane przy budowaniu
// listy kart), ale muszą iść przez bundle: podgląd importujący je aliasem `@/`
// dostaje DRUGĄ kopię modułu z własnym kontekstem, rozłączną z dostawcą - i
// ściągawka renderuje się pusta, bo czyta inny rejestr niż ten zapisywany.
export { useHotkeyList, useHotkeys } from '@/lib/hotkeys-context'

// Dostawca kontekstów - nie komponent systemu designu, ale musi być eksportem
// bundla, żeby cfg.provider mógł się do niego odwołać.
export { DesignPreviewProvider } from './preview-provider'
