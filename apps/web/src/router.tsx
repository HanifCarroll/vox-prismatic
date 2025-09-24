import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    // Provide a default not-found component to silence warnings
    defaultNotFoundComponent: NotFound,
  })
  return router
}

// TanStack Start's server expects `#tanstack-router-entry` to export `getRouter`
// Provide it as an alias to `createRouter` for compatibility
export function getRouter() {
  return createRouter()
}

function NotFound() {
  return (
    <div className="p-6 text-sm text-zinc-700">
      <h1 className="text-lg font-semibold mb-2">Not Found</h1>
      <p>The requested page could not be found.</p>
    </div>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
