import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { resolve } from 'node:path'

// TanStack Start + React + Tailwind
export default defineConfig({
  server: {
    port: 5173,
    fs: {
      // Allow importing files from the monorepo root/workspaces
      allow: ['..'],
    },
  },
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
  plugins: [
    tsConfigPaths({ projects: [resolve(__dirname, './tsconfig.json')], ignoreConfigErrors: true }),
    tanstackStart(), // must come before react plugin
    viteReact(),
    tailwindcss(),
  ],
})
