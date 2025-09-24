import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'

// Layout route for /projects that renders child routes via <Outlet />
export const Route = createFileRoute('/projects')({
  beforeLoad: async () => {
    try {
      await getSession()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})
