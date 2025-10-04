import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import { handleAuthGuardError } from '@/lib/auth-guard'
import * as postsClient from '@/lib/client/posts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

function CalendarPage() {
  const data = Route.useLoaderData() as Awaited<ReturnType<typeof postsClient.listScheduled>>
  const items = data.items

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Scheduled Posts</h1>
        <p className="text-zinc-600">Upcoming scheduled posts (read-only).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Next {items.length} posts</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-zinc-600">No scheduled posts.</div>
          ) : (
            <div className="divide-y">
              {items.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div className="text-sm text-zinc-800">
                    <div className="font-medium">Post</div>
                    <div className="text-zinc-600 truncate max-w-xl">{p.content}</div>
                  </div>
                  <div className="text-sm text-zinc-700">
                    {p.scheduledAt ? format(p.scheduledAt, 'PPpp') : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/calendar')({
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
  // Block rendering until scheduled posts are loaded
  loader: async () => postsClient.listScheduled({ page: 1, pageSize: 20 }),
  pendingMs: 0,
  pendingComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Scheduled Posts</h1>
      <div className="text-sm text-zinc-600">Loading schedule…</div>
    </div>
  ),
  component: CalendarPage,
})
