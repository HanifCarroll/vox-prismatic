import { Outlet, createRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import type { RootRoute } from '@tanstack/react-router'

// Pathless authenticated layout route that guards its children.
// Guard via server session check (cookie-based)
export default (parentRoute: RootRoute) =>
  createRoute({
    id: 'authenticatedLayout',
    getParentRoute: () => parentRoute,
    component: () => <Outlet />,
    beforeLoad: async () => {
      try {
        await getSession()
      } catch {
        throw redirect({ to: '/login' })
      }
    },
  })
