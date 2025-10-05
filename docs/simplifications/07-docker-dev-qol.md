Title: Improve Docker Dev Quality of Life

Current State
- `composer install` runs at container startup for `api`, `queue-worker`, and `reverb` services.
- Dev and prod images diverge in how the app is started (e.g., `artisan serve` and entrypoint behaviors).

Desired State
- Composer deps installed during image build steps and cached across builds.
- Fewer runtime setup steps on container start.
- Queue worker container runs multiple worker processes for parallel job processing.
- Keep API and queue-worker containers separate for better failure isolation and independent scaling.

Motivation
- Faster startup.
- Reduced cognitive load during development.
- Better production-readiness from day 1 (separate containers enable independent scaling).
- Parallel job processing without architectural changes.

High-Level Plan
1) Move `composer install` into Dockerfile build stages and mount code over a hydrated vendor dir or use bind mounts with a conditional install only when needed.
2) Align dev/prod entrypoints where possible; document differences explicitly when necessary.
3) Add supervisord to queue-worker container to run multiple `queue:work` processes (e.g., 3 workers for parallel processing).

