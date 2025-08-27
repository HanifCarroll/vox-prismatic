# Multi-stage Dockerfile for Next.js Web Application
# Supports both development and production targets

# Base stage - shared dependencies and setup
FROM oven/bun:1.2.20-alpine AS base

# Install system dependencies for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files from monorepo root and web app
COPY package.json bun.lockb* ./
COPY tsconfig.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/postcss.config.mjs ./apps/web/
COPY apps/web/components.json ./apps/web/

# Copy shared packages
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy shared packages source
COPY packages ./packages

# Copy web app source code
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public

# Development stage - for hot reload and development
FROM base AS development

# Keep working directory as /app to maintain proper package resolution
WORKDIR /app

# Expose port
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Development environment
ENV NODE_ENV=development

# Start Next.js development server with Turbopack from the correct directory
CMD ["bun", "--cwd", "apps/web", "dev"]

# Production build stage
FROM base AS builder

WORKDIR /app/apps/web

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN bun run build

# Production stage - optimized for serving
FROM oven/bun:1.2.20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Start the production server
CMD ["bun", "start"]