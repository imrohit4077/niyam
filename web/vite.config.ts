import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Dev API target; override with VITE_API_PROXY to point at another local backend.
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../static'),
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/files': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
