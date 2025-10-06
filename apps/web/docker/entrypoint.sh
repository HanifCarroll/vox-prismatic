#!/usr/bin/env sh
set -e

echo "Starting Laravel API server..."

# Cache configuration (requires APP_KEY to be available at runtime)
echo "Caching configuration with runtime environment variables..."
php artisan config:cache
php artisan route:cache
php artisan view:cache || true

# Run migrations (database must be reachable)
php artisan migrate --force || true

echo "Migrations complete. Starting scheduler and HTTP server..."

# Start scheduler in background
php artisan schedule:work &

# Start HTTP server (foreground to keep container alive)
exec php artisan serve --host=0.0.0.0 --port=${PORT:-3000}
