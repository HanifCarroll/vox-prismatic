#!/usr/bin/env sh
set -e

# Run migrations (database must be reachable)
php artisan migrate --force || true

# Start scheduler in background
php artisan schedule:work &

# Start queue worker in background
php artisan queue:work --queue=processing --tries=3 --timeout=600 --sleep=3 &

# Start HTTP server (foreground to keep container alive)
php artisan serve --host=0.0.0.0 --port=${PORT:-8000}

