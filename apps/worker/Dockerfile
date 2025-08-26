# Multi-stage Dockerfile for Background Worker
# Supports both development and production targets

# Base stage - shared dependencies and setup
FROM oven/bun:1.2.20-alpine AS base

WORKDIR /app

# Copy package files from monorepo root and worker
COPY package.json bun.lockb* ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/

# Copy API package.json for shared dependencies
COPY apps/api/package.json ./apps/api/

# Copy shared packages
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy shared packages source
COPY packages ./packages

# Copy worker and API source code (worker needs API services)
COPY apps/worker/src ./apps/worker/src
COPY apps/api/src ./apps/api/src

# Development stage - for hot reload and development
FROM base AS development

WORKDIR /app

# Health check for development
HEALTHCHECK --interval=60s --timeout=10s --start-period=15s --retries=3 \
    CMD pgrep -f "worker" > /dev/null || exit 1

# Development environment
ENV NODE_ENV=development

# Start worker with watch mode
CMD ["bun", "--watch", "apps/worker/src/index.ts"]

# Production build stage
FROM base AS builder

WORKDIR /app/apps/worker

# Set environment for build
ENV NODE_ENV=production

# Build the worker application
RUN bun run build

# Production stage - optimized for background processing
FROM oven/bun:1.2.20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S worker -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package.json ./package.json

# Copy necessary runtime dependencies and sources
COPY --from=builder --chown=worker:nodejs /app/packages ./packages
COPY --from=builder --chown=worker:nodejs /app/apps/api/src ./apps/api/src
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER worker

# Health check for production
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
    CMD pgrep -f "worker" > /dev/null || exit 1

# Production environment
ENV NODE_ENV=production

# Start the worker
CMD ["bun", "dist/index.js"]