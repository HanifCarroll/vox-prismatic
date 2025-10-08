# Multi-stage Dockerfile for Laravel API (dev + prod ready)
FROM php:8.3-cli AS base

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    PORT=8000

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    git unzip libpq-dev bash curl supervisor build-essential libssl-dev pkg-config \
 && docker-php-ext-install pdo pdo_pgsql bcmath pcntl \
 && pecl install redis \
 && docker-php-ext-enable redis \
 && rm -rf /var/lib/apt/lists/* /tmp/pear

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ============================================
# Frontend assets build stage
# ============================================
FROM node:20-bullseye-slim AS assets

WORKDIR /app

# Copy node manifest and install dependencies (dev deps required for Vite build)
COPY package.json package-lock.json* ./
RUN npm install

# Copy the full application to build assets
COPY . .
RUN npm run build

# ============================================
# Development stage
# ============================================
FROM base AS development

ENV APP_ENV=local

# Copy composer files first for better layer caching
COPY composer.json composer.lock ./

# Install ALL dependencies (including dev) and cache them in the image
RUN composer install --no-scripts --no-autoloader --no-interaction

# Copy application code
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize

EXPOSE 3000

# Default command for dev - will be overridden by docker-compose
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=3000"]

# ============================================
# Production stage
# ============================================
FROM base AS production

ENV APP_ENV=production

# Copy composer files
COPY composer.json composer.lock ./

# Install production dependencies only
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction

# Copy application code
COPY . .

# Generate optimized autoloader only
# Config/route/view caching will happen at runtime in entrypoint.sh when APP_KEY is available
RUN composer dump-autoload --optimize

# Remove development-only artefacts that break production asset resolution
RUN rm -f public/hot

# Copy pre-built frontend assets from the dedicated build stage
COPY --from=assets /app/public/build ./public/build

# Copy entrypoint and supervisor configs
COPY ./docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

CMD ["/entrypoint.sh"]
