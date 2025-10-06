#!/usr/bin/env sh
set -e

echo "Preparing Horizon runtime..."

# Wait for database to be ready and run migrations
until php artisan migrate --force >/dev/null 2>&1; do
  echo "Waiting for database/migrations to be ready..."
  sleep 2
done

echo "Migrations complete. Launching Horizon..."

exec php artisan horizon
