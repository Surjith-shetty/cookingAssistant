import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/detect': 'http://localhost:3001',
      '/recipes': 'http://localhost:3001',
    },
  },
})
