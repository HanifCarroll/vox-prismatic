import { createFileRoute, Outlet, redirect, isRedirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import { handleAuthGuardError } from '@/lib/auth-guard'

// Layout route for /projects that renders child routes via <Outlet />
export const Route = createFileRoute('/projects')({
  beforeLoad: async () => {
    try {
      await getSession()
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }
      const shouldRedirect = handleAuthGuardError(error)
      if (shouldRedirect) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: () => <Outlet />,
})
