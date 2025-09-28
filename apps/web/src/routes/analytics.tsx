import { createFileRoute, redirect } from '@tanstack/react-router'
import { format } from 'date-fns'
import { getSession } from '@/lib/session'
import * as postsClient from '@/lib/client/posts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const decimalFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold text-zinc-900">{value}</div>
        {description ? <p className="text-xs text-zinc-500 mt-1">{description}</p> : null}
      </CardContent>
    </Card>
  )
}

function AnalyticsPage() {
  const data = Route.useLoaderData() as Awaited<ReturnType<typeof postsClient.getAnalytics>>
  const { summary, daily, topHashtags } = data
  const recentDaily = daily.slice(-Math.min(14, daily.length))
  const averageLabel =
    summary.averageTimeToPublishHours === null
      ? '—'
      : `${decimalFormatter.format(summary.averageTimeToPublishHours)} hrs`

  const statusMeta: Array<{ key: keyof typeof summary.statusCounts; label: string; tone: 'default' | 'muted' }>
    = [
      { key: 'pending', label: 'Pending review', tone: 'muted' },
      { key: 'approved', label: 'Approved', tone: 'default' },
      { key: 'rejected', label: 'Rejected', tone: 'muted' },
      { key: 'published', label: 'Published', tone: 'default' },
    ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-600">
          Track how your LinkedIn posts are performing over the last {summary.rangeDays} days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total posts" value={numberFormatter.format(summary.totalPosts)} />
        <SummaryCard
          title={`Published (last ${summary.rangeDays} days)`}
          value={numberFormatter.format(summary.publishedInPeriod)}
        />
        <SummaryCard title="Scheduled" value={numberFormatter.format(summary.scheduledCount)} />
        <SummaryCard title="Avg. time to publish" value={averageLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusMeta.map((item) => {
              const value = summary.statusCounts[item.key]
              return (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.tone === 'muted' ? 'outline' : 'default'} className="uppercase tracking-wide">
                      {item.label}
                    </Badge>
                  </div>
                  <span className="font-medium text-zinc-900">{numberFormatter.format(value)}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Top hashtags</CardTitle>
          </CardHeader>
          <CardContent>
            {topHashtags.length === 0 ? (
              <p className="text-sm text-zinc-600">No hashtags yet. Add hashtags to your posts to see trends.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Hashtag</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topHashtags.map((item, index) => (
                    <TableRow key={item.tag}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="text-zinc-800">#{item.tag.replace(/^#+/, '')}</TableCell>
                      <TableCell className="text-right">
                        {numberFormatter.format(item.count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Publishing cadence</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDaily.length === 0 ? (
            <p className="text-sm text-zinc-600">No published posts in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDaily.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell className="text-zinc-800">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {numberFormatter.format(entry.published)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {recentDaily.length > 0 ? (
            <p className="text-xs text-zinc-500 mt-3">
              Showing the most recent {recentDaily.length} days within this window.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/analytics')({
  beforeLoad: async () => {
    try {
      await getSession()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => postsClient.getAnalytics(),
  pendingComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Analytics</h1>
      <p className="text-sm text-zinc-600">Loading analytics…</p>
    </div>
  ),
  component: AnalyticsPage,
})
