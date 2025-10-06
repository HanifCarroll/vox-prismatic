## Multi-stage build for Web (TanStack Start SSR + PNPM workspace)

FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for better caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web-deprecated/package.json apps/web-deprecated/package.json

# Install dependencies (workspace)
# web adds the nitro plugin at build time; allow lock refresh here
RUN pnpm install --no-frozen-lockfile

# Copy the full repo
COPY . .

# Provide API config at build time for Vite (embedded in client bundle)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Use local OpenAPI spec for production builds (instead of live API server)
# Path is relative to monorepo root (/app), not the web package directory
ENV ORVAL_TARGET=/app/apps/web-deprecated/openapi.json

# Build SSR output
RUN pnpm --filter web build


FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/apps/web-deprecated

# Enable pnpm (not strictly required at runtime, but keeps parity with other services)
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

# Copy workspace-scoped runtime dependencies
# Preserve the pnpm store by copying the root node_modules alongside the app.
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/web-deprecated/node_modules ./node_modules

# Copy built output (.output holds the Node server entry for Start)
COPY --from=builder /app/apps/web-deprecated/.output ./.output
COPY --from=builder /app/apps/web-deprecated/dist ./dist
COPY --from=builder /app/apps/web-deprecated/package.json ./package.json

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
