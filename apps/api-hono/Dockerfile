# Use official Bun image as base
FROM oven/bun:1.2.20-alpine as base

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files from monorepo root and API
COPY package.json bun.lock ./
COPY apps/api-hono/package.json ./apps/api-hono/
COPY apps/api-hono/tsconfig.json ./apps/api-hono/

# Copy shared packages
COPY packages/database/package.json ./packages/database/
COPY packages/ai/package.json ./packages/ai/
COPY packages/config/package.json ./packages/config/
COPY packages/prompts/package.json ./packages/prompts/
COPY packages/x/package.json ./packages/x/
COPY packages/linkedin/package.json ./packages/linkedin/

# Install dependencies
RUN bun install

# Copy shared packages source
COPY packages ./packages

# Copy API source code
COPY apps/api-hono/src ./apps/api-hono/src

# Copy Prisma schema
COPY apps/api-hono/prisma ./apps/api-hono/prisma

# Generate Prisma client
RUN cd apps/api-hono && bunx prisma generate

# Build the application (if build script exists)
# RUN cd apps/api-hono && bun run build

# Production stage
FROM oven/bun:1.2.20-alpine as production

# Install curl for health checks and runtime dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Create data directory
RUN mkdir -p /app/data

# Copy application source and dependencies
COPY --from=base /app/apps/api-hono ./
COPY --from=base /app/packages ./packages

# Copy node_modules (workspaces hoist to root)
COPY --from=base /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Change ownership of app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Set environment variables
ENV PORT=3001
ENV HOST=0.0.0.0

# Start the API server
CMD ["bun", "src/index.ts"]