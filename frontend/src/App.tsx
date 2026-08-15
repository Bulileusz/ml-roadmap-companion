import { MotionConfig } from 'motion/react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { AppShell } from '@/components/AppShell'
import { HotkeysProvider } from '@/lib/hotkeys'
import { Dane } from '@/routes/Dane'
import { Dziennik } from '@/routes/Dziennik'
import { Dzis } from '@/routes/Dzis'
import { Fiszki } from '@/routes/Fiszki'
import { Mapa } from '@/routes/Mapa'
import { NieZnaleziono } from '@/routes/NieZnaleziono'
import { Pytania } from '@/routes/Pytania'
import { Sesja } from '@/routes/Sesja'
import { Zasoby } from '@/routes/Zasoby'

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
              <Route path="fiszki" element={<Fiszki />} />
              <Route path="pytania" element={<Pytania />} />
              <Route path="zasoby" element={<Zasoby />} />
              <Route path="dziennik" element={<Dziennik />} />
              <Route path="dane" element={<Dane />} />
              <Route path="*" element={<NieZnaleziono />} />
            </Route>
          </Routes>
        </HotkeysProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
