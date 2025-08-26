# Use official Bun image as base
FROM oven/bun:1.1.42-alpine as base

# Set working directory
WORKDIR /app

# Copy package files from monorepo root and worker
COPY package.json bun.lockb ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/

# Copy API package.json for shared dependencies
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy worker source code and API source code (needed for shared services)
COPY apps/worker/src ./apps/worker/src
COPY apps/api/src ./apps/api/src

# Build the worker application
RUN cd apps/worker && bun run build

# Production stage
FROM oven/bun:1.1.42-alpine as production

WORKDIR /app

# Create data directory
RUN mkdir -p /app/data

# Copy built application
COPY --from=base /app/apps/worker/dist ./
COPY --from=base /app/apps/worker/package.json ./package.json

# Copy necessary source files that are imported at runtime
COPY --from=base /app/apps/api/src ./apps/api/src

# Copy node_modules (minimal production deps)
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/worker/node_modules ./apps/worker/node_modules

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Change ownership of app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Health check - verify worker process is running
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
  CMD bun index.js health || exit 1

# Start the worker
CMD ["bun", "index.js", "start"]