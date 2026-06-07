import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@doctor-hub/ui': path.resolve(__dirname, 'src/lib/ui'),
      '@doctor-hub/constants': path.resolve(__dirname, 'src/lib/constants'),
      '@doctor-hub/hooks': path.resolve(__dirname, 'src/lib/hooks'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: { port: 5173, strictPort: true },
})
