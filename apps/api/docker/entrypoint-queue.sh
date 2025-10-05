#!/usr/bin/env sh
set -e

echo "Starting queue worker with supervisor..."

# Wait for database to be ready
until php artisan migrate --pretend >/dev/null 2>&1; do
  echo "Waiting for database to be ready..."
  sleep 2
done

echo "Database is ready. Starting supervisor..."

# Start supervisord with the queue worker configuration
exec /usr/bin/supervisord -c /var/www/html/docker/supervisord-queue.conf
