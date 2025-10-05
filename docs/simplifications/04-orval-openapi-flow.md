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

