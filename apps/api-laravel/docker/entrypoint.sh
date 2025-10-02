#!/usr/bin/env sh
set -e

# Run migrations (database must be reachable)
php artisan migrate --force || true

# Start scheduler in background
php artisan schedule:work &

# Start HTTP server
php artisan serve --host=0.0.0.0 --port=${PORT:-8000}

