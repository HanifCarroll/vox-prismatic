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
# web adds the nitro plugin at build time; allow lock refresh here
RUN pnpm install --no-frozen-lockfile

# Copy the full repo
COPY . .

# Build shared types first
RUN pnpm --filter @content/shared-types build

# Provide API/Supabase config at build time for Vite (embedded in client bundle)
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build SSR output
RUN pnpm --filter web build


FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/apps/web

# Enable pnpm (not strictly required at runtime, but keeps parity with other services)
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate || npm i -g pnpm@9

# Copy workspace-scoped runtime dependencies
# Preserve the pnpm store by copying the root node_modules alongside the app.
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/web/node_modules ./node_modules

# Copy built output (.output holds the Node server entry for Start)
COPY --from=builder /app/apps/web/.output ./.output
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./package.json

# Provide built shared-types to satisfy workspace symlink if referenced at runtime
RUN mkdir -p /app/apps/shared-types
COPY --from=builder /app/apps/shared-types/package.json /app/apps/shared-types/package.json
COPY --from=builder /app/apps/shared-types/dist /app/apps/shared-types/dist

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
