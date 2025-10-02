#!/usr/bin/env sh
set -e

# Hydrate node_modules volumes from prebaked copies if empty
if [ ! -d "/repo/node_modules" ] || [ -z "$(ls -A /repo/node_modules 2>/dev/null || true)" ]; then
  echo "Hydrating /repo/node_modules from prebaked image cache..."
  mkdir -p /repo/node_modules
  cp -a /opt/dev-deps/root_node_modules/. /repo/node_modules/
fi

if [ ! -d "/repo/apps/web/node_modules" ] || [ -z "$(ls -A /repo/apps/web/node_modules 2>/dev/null || true)" ]; then
  echo "Hydrating /repo/apps/web/node_modules from prebaked image cache..."
  mkdir -p /repo/apps/web/node_modules
  cp -a /opt/dev-deps/web_node_modules/. /repo/apps/web/node_modules/
fi

# Build shared types (fast) to satisfy imports expected by Vite/SSR
pnpm --filter @content/shared-types build || true

# Start Vite dev server bound to all interfaces
pnpm --filter web dev -- --host 0.0.0.0 --port 5173

