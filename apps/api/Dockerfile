# Multi-stage build for API (Hono + PNPM workspace)

FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for better caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/shared-types/package.json apps/shared-types/package.json

# Install dependencies (workspace)
RUN pnpm install --frozen-lockfile

### Build phase
# Copy the full repo (needed for building)
COPY . .

# Build shared types first so runtime can import compiled JS
RUN pnpm --filter @content/shared-types build

# Build API
RUN cd apps/api && pnpm build


FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Enable pnpm for optional runtime utilities (e.g., migrations in job containers)
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

# Copy built API and workspace runtime deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# Provide built shared-types to satisfy workspace symlink resolution at runtime
RUN mkdir -p /app/apps/shared-types
COPY --from=builder /app/apps/shared-types/package.json ./apps/shared-types/package.json
COPY --from=builder /app/apps/shared-types/dist ./apps/shared-types/dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
