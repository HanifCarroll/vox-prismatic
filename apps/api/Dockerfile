# Multi-stage Dockerfile for NestJS API
# Supports both development and production targets

# Base stage - shared dependencies and setup
FROM oven/bun:1.2.20-alpine AS base

# Install system dependencies for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/queue/package.json ./packages/queue/
COPY packages/queue/tsconfig.json ./packages/queue/

# Install dependencies
RUN bun install

# Copy shared packages
COPY packages ./packages

# Copy API source and configuration
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Generate Prisma Client
WORKDIR /app/apps/api
RUN bunx prisma generate

# Development stage - for hot reload and development
FROM base AS development

WORKDIR /app/apps/api

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Development environment
ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0

# Start with NestJS watch mode
CMD ["bun", "run", "start:dev"]

# Production build stage
FROM base AS builder

WORKDIR /app/apps/api

# Build the application
RUN bun run build

# Production stage - optimized for production
FROM oven/bun:1.2.20-alpine AS production

# Install system dependencies
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json

# Copy environment files if they exist
COPY --from=builder --chown=nestjs:nodejs /app/.env* ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["bun", "run", "dist/main.js"]