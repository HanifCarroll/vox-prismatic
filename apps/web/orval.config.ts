import { defineConfig } from 'orval'

const specTarget = process.env.ORVAL_TARGET ?? '../api/storage/app/openapi.json'

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
