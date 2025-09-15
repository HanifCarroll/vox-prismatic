# Multi-stage build for API (Hono + PNPM workspace)

FROM node:20-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for better caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/shared-types/package.json apps/shared-types/package.json

# Install dependencies (workspace)
RUN pnpm install --frozen-lockfile

# Copy the full repo (needed for building)
COPY . .

# Build API
RUN cd apps/api && pnpm build


FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy built API and production deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/server.js"]

