# Simple prod-ready-ish Dockerfile for Laravel API (temporary replacement)
FROM php:8.3-cli as base

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    APP_ENV=production \
    PORT=8000

RUN apt-get update \
 && apt-get install -y --no-install-recommends git unzip libpq-dev \
 && docker-php-ext-install pdo pdo_pgsql \
 && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy app code
COPY . /var/www/html

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction \
 && php artisan config:cache \
 && php artisan route:cache \
 && php artisan view:cache || true

# Entrypoint script to run migrations then serve + scheduler
COPY ./docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

CMD ["/entrypoint.sh"]

