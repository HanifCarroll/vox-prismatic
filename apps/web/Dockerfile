## Multi-stage build for Web (TanStack Start SSR + PNPM workspace)

FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for better caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/shared-types/package.json apps/shared-types/package.json

# Install dependencies (workspace)
RUN pnpm install --frozen-lockfile

# Copy the full repo
COPY . .

# Build shared types first
RUN pnpm --filter @content/shared-types build

# Provide API base at build time for Vite
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build SSR output
RUN pnpm --filter web build


FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Enable pnpm (not strictly required at runtime, but keeps parity with other services)
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

# Copy node_modules to satisfy any non-bundled runtime deps
COPY --from=builder /app/node_modules ./node_modules

# Copy built output (TanStack Start build emits to dist/)
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./package.json

# Provide built shared-types to satisfy workspace symlink if referenced at runtime
RUN mkdir -p /app/apps/shared-types
COPY --from=builder /app/apps/shared-types/package.json ./apps/shared-types/package.json
COPY --from=builder /app/apps/shared-types/dist ./apps/shared-types/dist

EXPOSE 3000
CMD ["node", "dist/server/server.js"]
