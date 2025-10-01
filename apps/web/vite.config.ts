import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from '@tanstack/nitro-v2-vite-plugin'
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
      // Point to source so the build always sees the latest schemas without a separate build step
      '@content/shared-types': resolve(__dirname, '../shared-types/src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
  },
  plugins: [
    // Resolve TS paths early for both client & server builds
    tsConfigPaths({ projects: [resolve(__dirname, './tsconfig.json')], ignoreConfigErrors: true }),
    tanstackStart(),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
})
