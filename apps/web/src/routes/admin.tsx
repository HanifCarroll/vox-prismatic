import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { AdminUsage200 as AdminUsageResponse } from '@/api/generated.schemas'

// Create a compatible type for AdminUsageSummary
type AdminUsageSummary = {
  userId: string
  userName: string
  userEmail: string
  totalTokens: number
  totalCost: number
  projectCount: number
  postCount: number
  lastActiveAt: string | null
}

import { getSession } from '@/lib/session'
import { handleAuthGuardError } from '@/lib/auth-guard'
import { adminUsage, adminUpdateTrial } from '@/api/admin/admin'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/auth/AuthContext'

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
] as const

type RangeValue = (typeof RANGE_OPTIONS)[number]['value']

type LoaderData = {
  initialUsage: AdminUsageResponse
}

function computeRangeParams(range: RangeValue) {
  if (range === 'all') {
    return {}
  }
  const now = new Date()
  const from = new Date()
  if (range === '7d') {
    from.setDate(now.getDate() - 7)
  } else {
    from.setDate(now.getDate() - 30)
  }
  return { from: from.toISOString(), to: now.toISOString() }
}

function AdminDashboard() {
  const loaderData = Route.useLoaderData() as LoaderData
  const [range, setRange] = useState<RangeValue>('30d')
  const auth = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'usage', range],
    queryFn: async () => {
      const params = computeRangeParams(range)
      return adminUsage(params)
    },
    initialData: () => (range === '30d' ? loaderData.initialUsage : undefined),
  })

  const usage = query.data?.usage ?? []
  const isLoading = query.isLoading || query.isFetching

  const metrics = useMemo(() => {
    const totalSpend = usage.reduce((sum, item) => sum + item.totalCostUsd, 0)
    const totalActions = usage.reduce((sum, item) => sum + item.totalActions, 0)
    const activeSubscriptions = usage.filter((item) => item.subscriptionStatus === 'active').length
    const trialing = usage.filter((item) => {
      if (!item.trialEndsAt) return false
      return item.trialEndsAt.getTime() > Date.now()
    }).length
    return { totalSpend, totalActions, activeSubscriptions, trialing }
  }, [usage])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Admin dashboard</h1>
        <p className="text-zinc-600">Track AI usage costs, subscriptions, and trials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total spend" value={formatCurrency(metrics.totalSpend)} isLoading={isLoading} />
        <MetricCard label="Total AI actions" value={metrics.totalActions.toLocaleString()} isLoading={isLoading} />
        <MetricCard label="Active subscriptions" value={metrics.activeSubscriptions.toString()} isLoading={isLoading} />
        <MetricCard label="Active trials" value={metrics.trialing.toString()} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>User usage overview</CardTitle>
            <p className="text-sm text-zinc-500">Select a range to inspect aggregate usage and manage trials.</p>
          </div>
          <Select value={range} onValueChange={(value: RangeValue) => setRange(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last action</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-zinc-500 py-8">
                      {isLoading ? 'Loading usage…' : 'No usage recorded for this period yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  usage.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-zinc-500">{row.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(row.totalCostUsd)}</div>
                        <div className="text-xs text-zinc-500">{row.totalActions.toLocaleString()} actions</div>
                      </TableCell>
                      <TableCell>
                        {row.lastActionAt ? (
                          <div className="text-sm">
                            {formatDistanceToNow(row.lastActionAt, { addSuffix: true })}
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-500">No usage yet</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <SubscriptionStatus summary={row} />
                      </TableCell>
                      <TableCell>
                        <TrialSummary summary={row} />
                      </TableCell>
                      <TableCell className="text-right">
                        <AdminTrialDialog
                          summary={row}
                          onUpdated={async () => {
                            await query.refetch()
                            if (auth.user?.id === row.userId) {
                              await auth.refresh()
                            }
                            await qc.invalidateQueries({ queryKey: ['admin', 'usage'] })
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  isLoading,
}: {
  label: string
  value: string
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-500 font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-zinc-900">
          {isLoading ? <span className="text-base text-zinc-400">Loading…</span> : value}
        </div>
      </CardContent>
    </Card>
  )
}

function SubscriptionStatus({ summary }: { summary: AdminUsageSummary }) {
  const status = summary.subscriptionStatus
  const nextRenewal = summary.subscriptionCurrentPeriodEnd
  const label = status.replace(/_/g, ' ')
  const badgeVariant = status === 'active' ? 'default' : status === 'past_due' ? 'destructive' : 'secondary'
  return (
    <div className="space-y-1 text-sm">
      <Badge variant={badgeVariant}>{label}</Badge>
      {nextRenewal ? (
        <div className="text-xs text-zinc-500">Renews {nextRenewal.toLocaleDateString()}</div>
      ) : null}
      {summary.cancelAtPeriodEnd ? (
        <div className="text-xs text-amber-600">Cancels at period end</div>
      ) : null}
      {summary.stripeCustomerId ? (
        <div className="text-xs text-zinc-500">Customer ID {summary.stripeCustomerId}</div>
      ) : (
        <div className="text-xs text-zinc-500">Not yet subscribed</div>
      )}
    </div>
  )
}

function TrialSummary({ summary }: { summary: AdminUsageSummary }) {
  if (!summary.trialEndsAt) {
    return <span className="text-sm text-zinc-500">No active trial</span>
  }
  const now = Date.now()
  const remainingMs = summary.trialEndsAt.getTime() - now
  const isActive = remainingMs > 0
  return (
    <div className="text-sm text-zinc-600 space-y-1">
      <div>
        {isActive ? 'Ends ' : 'Ended '}
        {formatDistanceToNow(summary.trialEndsAt, { addSuffix: true })}
      </div>
      {summary.trialNotes ? (
        <div className="text-xs text-zinc-500 whitespace-pre-wrap">{summary.trialNotes}</div>
      ) : null}
    </div>
  )
}

function AdminTrialDialog({
  summary,
  onUpdated,
}: {
  summary: AdminUsageSummary
  onUpdated: () => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState(() => formatDateTimeLocal(summary.trialEndsAt))
  const [notes, setNotes] = useState(summary.trialNotes ?? '')

  const reset = () => {
    setTrialEndsAt('')
    setNotes('')
  }

  const submit = async () => {
    try {
      setSubmitting(true)
      const payload = {
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
        trialNotes: notes.trim() ? notes.trim() : null,
      }
      await adminUpdateTrial(summary.userId, { data: payload })
      toast.success('Trial updated')
      await onUpdated()
      setOpen(false)
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'error' in error && typeof (error as { error?: unknown }).error === 'string'
          ? ((error as { error: string }).error as string)
          : 'Failed to update trial'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage trial</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update trial for {summary.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700" htmlFor={`trial-${summary.userId}`}>
              Trial end
            </label>
            <Input
              id={`trial-${summary.userId}`}
              type="datetime-local"
              value={trialEndsAt}
              onChange={(event) => setTrialEndsAt(event.target.value)}
            />
            <div className="flex gap-2 text-xs text-zinc-500">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setTrialEndsAt(formatDateTimeLocal(addDays(7)))}
              >
                +7 days
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setTrialEndsAt(formatDateTimeLocal(addDays(14)))}
              >
                +14 days
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setTrialEndsAt('')}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700" htmlFor={`notes-${summary.userId}`}>
              Notes (optional)
            </label>
            <Textarea
              id={`notes-${summary.userId}`}
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Reason for trial, duration, or internal notes"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="sm:mr-auto"
            onClick={reset}
            disabled={submitting}
          >
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function addDays(days: number) {
  const base = new Date()
  base.setDate(base.getDate() + days)
  return base
}

function formatDateTimeLocal(date: Date | null | undefined) {
  if (!date) return ''
  const iso = new Date(date).toISOString()
  return iso.slice(0, 16)
}

export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: async () => {
    try {
      const session = await getSession()
      if (!session.user.isAdmin) {
        throw redirect({ to: '/projects' })
      }
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
  loader: async () => {
    const session = await getSession()
    if (!session.user.isAdmin) {
      throw redirect({ to: '/projects' })
    }
    const params = computeRangeParams('30d')
    const initialUsage = await adminUsage(params)
    return { initialUsage }
  },
  component: AdminDashboard,
})
