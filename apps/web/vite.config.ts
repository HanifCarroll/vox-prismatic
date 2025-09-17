import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Resolve workspace package locally during dev
      '@content/shared-types': resolve(__dirname, '../shared-types'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
  },
  server: {
    fs: {
      // Allow importing files from the monorepo root/workspaces
      allow: ['..'],
    },
  },
})
