import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to the FastAPI backend so the browser stays same-origin
    // in dev (no CORS preflight). Frontend code uses a relative baseURL of
    // `/api/v1` — see src/api/client.ts and .env.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
