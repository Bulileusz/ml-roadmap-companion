// Konteksty, których komponenty tego frontu wymagają do wyrenderowania.
//
// W aplikacji stawia je main.tsx i App.tsx, ale te pliki mają efekty uboczne
// (createRoot na #root), więc nie mogą trafić do bundla. To jest ta sama drabina
// dostawców, tylko bez montowania aplikacji - i z MemoryRouterem zamiast
// BrowserRoutera, żeby podgląd nie dotykał adresu strony.
//
// Bez tego: PhaseCard wywala się na useQuery, AppShell i SessionHero na
// useNavigate, HotkeyCheatsheet na pustym rejestrze skrótów.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

import { keys } from '@/api/queries'
import { HotkeysProvider } from '@/lib/hotkeys'

import { TASKS_PHASE_2 } from './fixtures'

// Zapytania w podglądzie nie mają dokąd pójść - backendu nie ma. Zero prób
// ponowienia i nieskończony staleTime, żeby karta nie migała spinnerem ani nie
// dobijała się do /api w pętli.
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    },
  },
})

// Dosiane dane zamiast pustego cache'u: rozwinięty PhaseCard bez tego pokazałby
// „ta faza nie ma jeszcze zadań", czyli stan pusty zamiast tego, co komponent
// naprawdę robi - listy zadań z checkboxami w barwie fazy.
client.setQueryData(keys.tasks(3), TASKS_PHASE_2)

export function DesignPreviewProvider({ children }: { children: ReactNode }) {
  return (
    // skipAnimations: karty podglądu to statyczne zrzuty, a harness robi je
    // zaraz po `networkidle` - w połowie animacji wejścia. Komponenty tej apki
    // wjeżdżają z `opacity: 0`, więc bez tego SessionHero, StatCard i AllDone
    // fotografują się jako puste prostokąty. Opcja jest wprost od Motion pod
    // testy wizualne: wartości ustawiają się natychmiast na docelowe.
    <MotionConfig reducedMotion="user" skipAnimations>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <HotkeysProvider>
            {/* Ciemne płótno wprost na kontenerze, mimo że theme.css ustawia je
                w @layer base na <body>. Karta podglądu ma własny chrome z
                zaszytym `body{background:#fff}`, który tę regułę przykrywa - i
                cały motyw, zbudowany pod ciemne tło, robi się nieczytelny
                (text-ink to prawie biel). W realnej stronie problem nie
                występuje: tam obowiązuje @layer base ze styles.css. */}
            <div className="bg-canvas text-ink font-sans rounded-xl p-4">
              {children}
            </div>
          </HotkeysProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </MotionConfig>
  )
}
