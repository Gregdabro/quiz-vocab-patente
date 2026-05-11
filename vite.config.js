import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['ios_saf >= 12', 'safari >= 12', 'chrome >= 92'],
    }),
  ],
  build: {
    target: ['es2015', 'safari12', 'ios12'],
  }
})
