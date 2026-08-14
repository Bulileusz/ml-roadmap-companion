import { MotionConfig } from 'motion/react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { AppShell } from '@/components/AppShell'
import { HotkeysProvider } from '@/lib/hotkeys'
import { Dashboard } from '@/routes/Dashboard'
import { Placeholder } from '@/routes/Placeholder'

export function App() {
  return (
    // reducedMotion="user" na korzeniu: jedno miejsce zamiast useReducedMotion
    // w każdym komponencie. Framer wycisza wtedy transformacje, zostawiając
    // przejścia opacity, więc interfejs dalej się zmienia, tylko nie rusza.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <HotkeysProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route
                path="session"
                element={<Placeholder title="Sesja dnia" plannedIn="PR 2" />}
              />
              <Route
                path="flashcards"
                element={<Placeholder title="Fiszki" plannedIn="PR 2" />}
              />
              <Route
                path="questions"
                element={<Placeholder title="Bank pytań" plannedIn="PR 3" />}
              />
              <Route
                path="resources"
                element={<Placeholder title="Zasoby" plannedIn="PR 3" />}
              />
              <Route
                path="journal"
                element={<Placeholder title="Dziennik nauki" plannedIn="PR 4" />}
              />
              <Route
                path="data"
                element={<Placeholder title="Dane" plannedIn="PR 4" />}
              />
              <Route
                path="*"
                element={<Placeholder title="Nie ma tu nic" plannedIn="—" />}
              />
            </Route>
          </Routes>
        </HotkeysProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
