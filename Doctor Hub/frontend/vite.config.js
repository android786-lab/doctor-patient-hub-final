import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { doctorHubUiAlias, doctorHubDedupe } from '../shared/ui/vite-alias.js'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: doctorHubUiAlias(import.meta.url),
    dedupe: doctorHubDedupe(),
  },
  server: { port: 5173, strictPort: true },
})
