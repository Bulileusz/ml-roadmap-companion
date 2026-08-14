import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Proxy zamiast CORS-a na backendzie: przeglądarka widzi jedno źródło,
    // więc nie ma nagłówków do konfigurowania ani preflightów do debugowania.
    // W wersji zbudowanej ten sam efekt daje uvicorn serwujący frontend/dist.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // CSS nie jest przetwarzany w testach: Tailwind i tak nie ma nic do
    // sprawdzenia w jsdom, a przepuszczanie go wydłuża każdy przebieg.
    css: false,
  },
})
