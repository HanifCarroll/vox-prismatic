# Use official Bun image as base
FROM oven/bun:1.1.42-alpine as base

# Set working directory
WORKDIR /app

# Copy package files from monorepo root and web
COPY package.json bun.lockb ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/postcss.config.mjs ./apps/web/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy web app source code
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public

# Build the Next.js application
RUN cd apps/web && bun run build

# Production stage  
FROM oven/bun:1.1.42-alpine as production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/package.json ./apps/web/package.json
COPY --from=base /app/package.json ./package.json

# Copy node_modules
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/web/node_modules ./apps/web/node_modules

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Change to web app directory and start
WORKDIR /app/apps/web
CMD ["bun", "start"]