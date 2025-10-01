import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  splitting: false,
  clean: true,
  treeshake: true,
  dts: false,
  minify: false,
  // Use tsconfig for path alias resolution; tsup will pick up `paths`.
  tsconfig: 'tsconfig.json',
})

