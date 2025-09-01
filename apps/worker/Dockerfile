# Multi-stage Dockerfile for Background Worker
# Supports both development and production targets

# Base stage - shared dependencies and setup
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@9

WORKDIR /app

# Copy package files from monorepo root and worker
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/

# Copy API package.json for shared dependencies
COPY apps/api/package.json ./apps/api/

# Copy shared packages
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/queue/package.json ./packages/queue/
COPY packages/queue/tsconfig.json ./packages/queue/

# Install dependencies with workspace links
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy shared packages source
COPY packages ./packages

# Build the shared packages (types and queue)
RUN pnpm --filter=@content-creation/types run build && \
    pnpm --filter=@content-creation/queue run build

# Copy worker and API source code (worker needs API services)
COPY apps/worker/src ./apps/worker/src
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client
# Use pnpm to run prisma from the worker package context
RUN cd apps/worker && pnpm exec prisma generate --schema=../api/prisma/schema.prisma

# Development stage - for hot reload and development
FROM base AS development

WORKDIR /app

# Health check for development
HEALTHCHECK --interval=60s --timeout=10s --start-period=15s --retries=3 \
    CMD pgrep -f "worker" > /dev/null || exit 1

# Development environment
ENV NODE_ENV=development

# Start worker with watch mode using tsx
CMD ["pnpm", "exec", "tsx", "watch", "apps/worker/src/index.ts"]

# Production build stage
FROM base AS builder

WORKDIR /app/apps/worker

# Set environment for build
ENV NODE_ENV=production

# Build the worker application
RUN pnpm run build

# Production stage - optimized for background processing
FROM node:20-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm@9

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
COPY --from=builder --chown=worker:nodejs /app/apps/api/prisma ./apps/api/prisma

# Switch to non-root user
USER worker

# Health check for production
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
    CMD pgrep -f "worker" > /dev/null || exit 1

# Production environment
ENV NODE_ENV=production

# Start the worker
CMD ["node", "dist/index.js"]