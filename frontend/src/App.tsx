import { MotionConfig } from 'motion/react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { AppShell } from '@/components/AppShell'
import { HotkeysProvider } from '@/lib/hotkeys'
import { Dzis } from '@/routes/Dzis'
import { Mapa } from '@/routes/Mapa'
import { Placeholder } from '@/routes/Placeholder'
import { Sesja } from '@/routes/Sesja'

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
              <Route index element={<Dzis />} />
              <Route path="mapa" element={<Mapa />} />
              <Route path="sesja" element={<Sesja />} />
              <Route
                path="fiszki"
                element={<Placeholder title="Fiszki" plannedIn="PR 3" />}
              />
              <Route
                path="pytania"
                element={<Placeholder title="Bank pytań" plannedIn="PR 3" />}
              />
              <Route
                path="zasoby"
                element={<Placeholder title="Zasoby" plannedIn="PR 4" />}
              />
              <Route
                path="dziennik"
                element={<Placeholder title="Dziennik nauki" plannedIn="PR 4" />}
              />
              <Route
                path="dane"
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
