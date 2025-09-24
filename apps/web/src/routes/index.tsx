import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    try {
      await getSession()
      throw redirect({ to: '/projects' })
    } catch {}
    throw redirect({ to: '/login' })
  },
  component: () => null,
})
