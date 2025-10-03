import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'
import { resolve } from 'node:path'

// TanStack Start + React + Tailwind
export default defineConfig({
  server: {
    // Ensure the dev server is reachable from Docker host
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      // Allow importing files from the monorepo root/workspaces
      allow: ['..'],
    },
    proxy: {
      // Proxy API requests to Laravel backend to avoid CORS issues
      // Uses Docker service name 'api' and internal port 3000
      '/api': {
        target: 'http://api:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Sanctum CSRF cookie endpoint
      '/sanctum': {
        target: 'http://api:3000',
        changeOrigin: true,
        secure: false,
      },
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
    nitroV2Plugin(),
    viteReact(),
    tailwindcss(),
  ],
})
