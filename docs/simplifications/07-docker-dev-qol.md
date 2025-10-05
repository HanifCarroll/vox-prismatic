Title: Improve Docker Dev Quality of Life

Current State
- `composer install` runs at container startup for `api`, `queue-worker`, and `reverb` services.
- Dev and prod images diverge in how the app is started (e.g., `artisan serve` and entrypoint behaviors).
- Queue worker runs in a separate container during dev.
- Committed `.env` contains secrets; `.env.example` may not fully mirror required keys.

Desired State
- Composer deps installed during image build steps and cached across builds.
- Fewer runtime setup steps on container start.
- Optionally run queue worker in the API container in dev to reduce moving parts.
- Secrets kept out of VCS; `.env.example` mirrors expected env.

Motivation
- Faster startup, fewer failure modes.
- Reduced cognitive load during development.
- Better security hygiene.

High-Level Plan
1) Move `composer install` into Dockerfile build stages and mount code over a hydrated vendor dir or use bind mounts with a conditional install only when needed.
2) Align dev/prod entrypoints where possible; document differences explicitly when necessary.
3) For dev: provide an option to start the queue worker from the API container (`supervisord` or background `artisan queue:work`) to simplify compose.
4) Remove committed secrets; add/update `.env.example` with all required keys and notes for local setup.

