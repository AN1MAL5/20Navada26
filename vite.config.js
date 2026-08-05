import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use repo base only when building for GitHub Pages; dev server stays at /
  base: command === 'build' ? '/AAMVANV/' : '/',
  optimizeDeps: {
    exclude: ["@imgly/background-removal"],
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
}))
