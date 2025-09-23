import { createRoute } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import * as postsClient from '@/lib/client/posts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

function CalendarPage() {
  const query = useQuery({
    queryKey: ['scheduled', { page: 1, pageSize: 20 }],
    queryFn: () => postsClient.listScheduled({ page: 1, pageSize: 20 }),
  })

  const items = query.data?.items || []

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
          {query.isLoading ? (
            <div className="text-sm text-zinc-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-zinc-600">No scheduled posts.</div>
          ) : (
            <div className="divide-y">
              {items.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div className="text-sm text-zinc-800">
                    <div className="font-medium">Post #{p.id}</div>
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

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/calendar',
    component: CalendarPage,
    getParentRoute: () => parentRoute,
  })
