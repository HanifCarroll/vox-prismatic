import { defineConfig } from 'orval'

// Use live OpenAPI spec from Scramble via Vite proxy
// This ensures Orval always consumes a fresh API spec instead of a stale local file
// The Vite dev server proxies /api/* to the Laravel backend (http://api:3000)
const specTarget = process.env.ORVAL_TARGET ?? 'http://localhost:5173/api/openapi.json'

export default defineConfig({
  api: {
    input: {
      target: specTarget,
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated.ts',
      client: 'react-query',
      httpClient: 'axios',
      baseUrl: '/api',
      override: {
        mutator: {
          path: './src/lib/client/orval-fetcher.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
})
