import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/havis-wicked-adventure/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
