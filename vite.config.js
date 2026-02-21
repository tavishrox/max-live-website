import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use relative asset paths so the build works on both repo Pages URL and custom domains.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
})
