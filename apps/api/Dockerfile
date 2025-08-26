# Use official Bun image as base
FROM oven/bun:1.2.20-alpine as base

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files from monorepo root and API
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/

# Copy shared types package
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/

# Install dependencies
RUN bun install

# Copy shared types package (no build needed - use source directly)
COPY packages/types ./packages/types

# Copy API source code
COPY apps/api/src ./apps/api/src

# Build the application
RUN cd apps/api && bun run build

# Production stage
FROM oven/bun:1.2.20-alpine as production

# Install curl for health checks and runtime dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Create data directory
RUN mkdir -p /app/data

# Copy built application
COPY --from=base /app/apps/api/dist ./
COPY --from=base /app/apps/api/package.json ./package.json

# Copy types package source (no dist needed)
COPY --from=base /app/packages/types/src ./packages/types/src
COPY --from=base /app/packages/types/package.json ./packages/types/package.json
COPY --from=base /app/packages/types/tsconfig.json ./packages/types/tsconfig.json

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
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the API server
CMD ["bun", "index.js"]