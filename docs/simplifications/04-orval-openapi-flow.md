Title: Stabilize Orval + OpenAPI Flow

Current State
- Orval reads a local file path (`../api/storage/app/openapi.json`) that may be stale.
- No guaranteed pre-step generates the JSON before running Orval in dev.

Desired State
- Orval always consumes a fresh API spec.
- Either fetch the live spec during generation or ensure a deterministic generation step precedes Orval.

Motivation
- Prevent drift between backend contracts and generated clients.
- Reduce class of runtime failures due to outdated types or endpoints.

High-Level Plan
1) Preferred: Point Orval `input.target` to the live `openapi.json` exposed by Scramble in local (via Vite proxy or direct API URL).
2) Alternative: Add a script `php artisan scramble:openapi --output=storage/app/openapi.json` and run it before `orval`.
3) Update `pnpm` scripts to run `generate:api` as part of `prebuild` and dev workflows.
4) Document how to regenerate types on backend changes.

