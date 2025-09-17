import { createRoute } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import * as linkedinClient from '@/lib/client/linkedin'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

function SettingsPage() {
  const { data, isLoading } = useLinkedInStatus()
  const qc = useQueryClient()

  const resolveErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'error' in error) {
      const candidate = (error as { error?: unknown }).error
      if (typeof candidate === 'string') {
        return candidate
      }
    }
    return fallback
  }

  const connect = async () => {
    try {
      const { url } = await linkedinClient.getAuthUrl()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to start LinkedIn OAuth'))
    }
  }

  const disconnect = async () => {
    try {
      await linkedinClient.disconnect()
      await qc.invalidateQueries({ queryKey: ['linkedin', 'status'] })
      toast.success('Disconnected from LinkedIn')
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, 'Failed to disconnect LinkedIn'))
    }
  }

  const connected = !!data?.connected

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-zinc-600">Profile, Integrations, and Defaults.</p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Integrations</h2>
        <Card>
          <CardHeader>
            <CardTitle>LinkedIn</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-zinc-700">
              {isLoading ? 'Checking status…' : connected ? 'Connected' : 'Not connected'}
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={connect}>
                  Connect LinkedIn
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/settings',
    component: SettingsPage,
    getParentRoute: () => parentRoute,
  })
