import { createRoute, useNavigate } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

function LinkedInCallbackPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    const message = params.get('message')

    if (status === 'connected') {
      toast.success('LinkedIn connected')
    } else {
      toast.error(message || 'LinkedIn connection failed')
    }

    // Refresh LinkedIn status and send user to Settings > Integrations
    qc.invalidateQueries({ queryKey: ['linkedin', 'status'] })
    navigate({ to: '/settings', search: { tab: 'integrations' } })
  }, [navigate, qc])

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Connecting LinkedIn…</h1>
      <p className="text-sm text-zinc-600">Finishing up and redirecting.</p>
    </div>
  )
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/integrations/linkedin/callback',
    component: LinkedInCallbackPage,
    getParentRoute: () => parentRoute,
  })

