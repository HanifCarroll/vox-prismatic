import { Outlet, createRoute, redirect } from '@tanstack/react-router'
import type { RootRoute } from '@tanstack/react-router'

// Pathless authenticated layout route that guards its children.
// For MVP, we guard via localStorage token presence.
export default (parentRoute: RootRoute) =>
  createRoute({
    id: 'authenticatedLayout',
    getParentRoute: () => parentRoute,
    component: () => <Outlet />,
    beforeLoad: () => {
      const token = localStorage.getItem('auth:token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    },
  })

