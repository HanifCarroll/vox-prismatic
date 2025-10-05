#!/usr/bin/env sh
set -e

echo "Starting queue worker with supervisor..."

# Wait for database to be ready and run migrations
until php artisan migrate --force >/dev/null 2>&1; do
  echo "Waiting for database/migrations to be ready..."
  sleep 2
done

echo "Migrations complete. Starting supervisor..."

# Start supervisord with the queue worker configuration
exec /usr/bin/supervisord -c /var/www/html/docker/supervisord-queue.conf
