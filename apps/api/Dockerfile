# Multi-stage Dockerfile for NestJS API
# Supports both development and production targets

# Base stage - shared dependencies and setup
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@9

# Install system dependencies for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/queue/package.json ./packages/queue/

# Copy tsconfig files (needed for building packages)
COPY tsconfig.json ./
COPY packages/queue/tsconfig.json ./packages/queue/
COPY packages/types/tsconfig.json ./packages/types/

# Install dependencies with workspace links
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy shared packages
COPY packages ./packages

# Build the shared packages (types and queue)
RUN pnpm --filter=@content-creation/types run build && \
    pnpm --filter=@content-creation/queue run build

# Copy API source and configuration
COPY apps/api ./apps/api

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm exec prisma generate

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
CMD ["pnpm", "run", "start:dev"]

# Production build stage
FROM base AS builder

WORKDIR /app/apps/api

# Build the application
RUN pnpm run build

# Production stage - optimized for production
FROM node:20-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm@9

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
CMD ["node", "dist/main.js"]