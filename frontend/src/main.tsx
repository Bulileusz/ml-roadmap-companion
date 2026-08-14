import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/plus-jakarta-sans'

import { App } from './App'
import './styles/theme.css'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      // Backend siedzi na localhoście, więc zapytanie kosztuje milisekundy -
      // ale odświeżanie tego samego widoku przy każdym przejściu między
      // stronami mrugałoby danymi bez powodu.
      staleTime: 30_000,
      // Apkę zostawia się otwartą na cały dzień. Powrót do karty ma pokazać
      // dzisiejszy stan, a nie ten sprzed czterech godzin.
      refetchOnWindowFocus: true,
      // Jeden retry: sensowny przy chwilowym restarcie uvicorna z --reload,
      // bezsensowny przy błędzie 4xx, który powtórzy się identycznie.
      retry: 1,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Brak #root w index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
