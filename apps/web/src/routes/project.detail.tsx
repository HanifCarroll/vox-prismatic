import { createRoute, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as projectsClient from '@/lib/client/projects'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import { useProjectPosts, type ProjectPostsQueryResult } from '@/hooks/queries/useProjectPosts'
import { useTranscript } from '@/hooks/queries/useTranscript'
import {
  useBulkSetStatus,
  usePublishNow,
  useUpdatePost,
  useBulkRegeneratePosts,
  useSchedulePost,
  useUnschedulePost,
  useAutoschedulePost,
  useAutoscheduleProject,
} from '@/hooks/mutations/usePostMutations'
import { useUpdateTranscript } from '@/hooks/mutations/useTranscriptMutations'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TextareaAutosize } from '@/components/ui/textarea-autosize'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import ProjectDeleteButton from '@/components/ProjectDeleteButton'
import * as linkedinClient from '@/lib/client/linkedin'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format, formatDistanceToNow, isAfter, startOfToday } from 'date-fns'
import type {
  Post,
  PostScheduleStatus,
  PostStatus,
  ProjectStage,
} from '@content/shared-types'

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'error' in error) {
    const candidate = (error as { error?: unknown }).error
    if (typeof candidate === 'string') {
      return candidate
    }
  }
  return fallback
}

// Narrow to moderation statuses only (published handled separately)

const isModerationStatus = (
  value: unknown,
): value is Exclude<PostStatus, 'published'> =>
  value === 'pending' || value === 'approved' || value === 'rejected'

const isPromiseLike = <T,>(value: unknown): value is Promise<T> =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'then' in (value as { then?: unknown }) &&
      typeof (value as { then?: unknown }).then === 'function',
  )

const getNextHourSlot = () => {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setMinutes(0, 0, 0)
  nextHour.setHours(nextHour.getHours() + 1)
  return nextHour
}

type ProjectPostsQuery = ProjectPostsQueryResult

function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const id = useMemo(() => Number(projectId), [projectId])
  const navigate = useNavigate({ from: '/projects/$projectId' })
  const routerState = useRouterState()
  const searchObj = (routerState.location as any)?.search || {}
  const tabParam =
    (searchObj as any).tab ||
    new URLSearchParams(routerState.location.searchStr || '').get('tab')
  const urlTab: 'transcript' | 'posts' | null =
    tabParam === 'transcript' ? 'transcript' : tabParam === 'posts' ? 'posts' : null

  // Project query (non-blocking)
  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsClient.get(id),
    enabled: !!id,
  })

  const [title, setTitle] = useState<string>('')
  const [stage, setStage] = useState<ProjectStage>('processing')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('Waiting to start…')
  const [activeTab, setActiveTab] = useState<'transcript' | 'posts'>('transcript')
  const abortRef = useRef<AbortController | null>(null)
  const updatingStageRef = useRef(false)

  // LinkedIn status
  const { data: linkedInStatus } = useLinkedInStatus()

  // Posts query
  const [postsEnabled, setPostsEnabled] = useState(false)
  const postsQuery = useProjectPosts(id, postsEnabled)

  // Transcript query
  const transcriptQuery = useTranscript(id)

  // Sync local state from project query when it resolves
  // Initialize active tab from URL (deep link) or ensure URL reflects default
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
      return
    }
    if (!urlTab) {
      navigate({ to: '.', search: { tab: activeTab }, replace: true })
    }
  }, [urlTab])

  useEffect(() => {
    const p = projectQuery.data?.project
    if (!p) {
      return
    }
    setTitle(p.title)
    setStage(p.currentStage)
    if (p.currentStage !== 'processing') {
      setPostsEnabled(true)
    }
  }, [projectQuery.data])

  // Mutations
  const updatePostMutation = useUpdatePost(id)
  const bulkSetStatusMutation = useBulkSetStatus(id)
  const publishNowMutation = usePublishNow(id)
  const schedulePostMutation = useSchedulePost(id)
  const unschedulePostMutation = useUnschedulePost(id)
  const autoschedulePostMutation = useAutoschedulePost(id)
  const autoscheduleProjectMutation = useAutoscheduleProject(id)
  const updateTranscriptMutation = useUpdateTranscript(id)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!projectQuery.data?.project) {
        return
      }
      if (!mounted) {
        return
      }
      const proj = projectQuery.data.project
      setTitle(proj.title)
      setStage(proj.currentStage)
      if (proj.currentStage !== 'processing') {
        setPostsEnabled(true)
        return
      }

      // Start SSE with simple auto-retry on disconnect/cancel while still processing
      const ac = new AbortController()
      abortRef.current = ac
      setStatus('Starting…')
      setProgress(1)
      const run = async () => {
        while (mounted && !ac.signal.aborted) {
          try {
            await projectsClient.processStream(id, ({ event, data }) => {
              switch (event) {
                case 'started':
                  setStatus('Processing started')
                  setProgress(5)
                  break
                case 'progress': {
                  const progressData =
                    data && typeof data === 'object'
                      ? (data as { progress?: number; step?: string })
                      : {}
                  if (typeof progressData.progress === 'number') {
                    setProgress(Math.max(5, Math.min(99, progressData.progress)))
                  }
                  if (progressData.step) {
                    setStatus(String(progressData.step).replaceAll('_', ' '))
                  }
                  break
                }
                case 'insights_ready':
                  setStatus('Insights ready')
                  setProgress(60)
                  break
                case 'posts_ready':
                  setStatus('Post drafts ready')
                  setProgress(85)
                  setPostsEnabled(true)
                  break
                case 'complete':
                  setStatus('Complete')
                  setProgress(100)
                  setStage('posts')
                  setActiveTab('posts')
                  navigate({ to: '.', search: { tab: 'posts' } })
                  setPostsEnabled(true)
                  break
                case 'timeout':
                  setStatus('Timed out')
                  break
                case 'error':
                  setStatus('Processing failed')
                  break
                case 'ping':
                  break
              }
            }, ac.signal)

            // Stream ended normally; if still in processing, reconnect
            if (mounted && !ac.signal.aborted && stage === 'processing') {
              setStatus('Reconnecting…')
              await new Promise<void>((resolve) => setTimeout(resolve, 1000))
              continue
            }
            break
          } catch {
            if (!mounted || ac.signal.aborted) {
              break
            }
            setStatus('Reconnecting…')
            await new Promise<void>((resolve) => setTimeout(resolve, 1000))
          }
        }
      }
      run()
    })()

    return () => {
      mounted = false
      abortRef.current?.abort()
    }
  }, [id, stage, projectQuery.data])

  const schedulePendingId =
    schedulePostMutation.isPending && schedulePostMutation.variables?.postId
      ? schedulePostMutation.variables.postId
      : null
  const unschedulePendingId =
    unschedulePostMutation.isPending && unschedulePostMutation.variables?.postId
      ? unschedulePostMutation.variables.postId
      : null
  const autoschedulePendingId =
    autoschedulePostMutation.isPending && typeof autoschedulePostMutation.variables === 'number'
      ? (autoschedulePostMutation.variables as number)
      : null

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <InlineTitle
            title={title || 'Untitled Project'}
            onChange={(val) => setTitle(val)}
            onSave={(val) => projectsClient.update(id, { title: val }).then(() => undefined)}
          />
          <div className="text-sm text-zinc-600">Stage: {stage}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: '/projects' })}>
            Back to Projects
          </Button>
          <ProjectDeleteButton
            projectId={id}
            projectTitle={title || 'Project'}
            variant="destructive"
            size="sm"
            onDeleted={() => navigate({ to: '/projects' })}
          />
        </div>
      </div>

      {/* Inline processing banner (replaces Overview tab) */}
      {stage === 'processing' && (
        <div className="mt-2 rounded-md border bg-white px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium text-zinc-800">{status}</div>
            <div className="text-xs text-zinc-500">{progress}%</div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-zinc-100">
            <div
              className="h-full bg-zinc-800 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-zinc-500">Processing uses SSE. This updates live.</div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(next) => {
          if (next === 'transcript' || next === 'posts') {
            setActiveTab(next)
            navigate({ to: '.', search: { tab: next } })
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2">
          <div className="text-sm text-zinc-700">{status}</div>
          <Progress value={progress} />
          <div className="text-xs text-zinc-500">
            Processing uses SSE. This view updates as events arrive.
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-3">
          <PostsPanel
            projectId={id}
            postsQuery={postsQuery}
            linkedInConnected={!!linkedInStatus?.connected}
            onSetStatus={(postId, status) =>
              updatePostMutation.mutate({ postId, data: { status } })
            }
            onSaveContent={(postId, content) =>
              updatePostMutation
                .mutateAsync({ postId, data: { content } })
                .then(() => undefined)
            }
            onPublish={(postId) => publishNowMutation.mutate(postId)}
            onProjectAutoSchedule={() => autoscheduleProjectMutation.mutate({})}
            projectAutoSchedulePending={autoscheduleProjectMutation.isPending}
            onBulk={(ids, status) => bulkSetStatusMutation.mutate({ ids, status })}
            onSchedule={(postId, scheduledAt) =>
              schedulePostMutation
                .mutateAsync({ postId, scheduledAt })
                .then(() => undefined)
            }
            onUnschedule={(postId) =>
              unschedulePostMutation.mutateAsync({ postId }).then(() => undefined)
            }
            onAutoSchedule={(postId) =>
              autoschedulePostMutation.mutateAsync(postId).then(() => undefined)
            }
            schedulePendingId={schedulePendingId ?? undefined}
            unschedulePendingId={unschedulePendingId ?? undefined}
            autoschedulePendingId={autoschedulePendingId ?? undefined}
            onAllReviewed={() => {
              if (updatingStageRef.current || stage === 'ready') {
                return
              }
              updatingStageRef.current = true
              projectsClient
                .updateStage(id, { nextStage: 'ready' })
                .then(() => setStage('ready'))
                .finally(() => {
                  updatingStageRef.current = false
                })
            }}
          />
        </TabsContent>

        <TabsContent value="transcript" className="mt-4 space-y-3">
          {transcriptQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Original Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <TextAreaEditor
                  initial={transcriptQuery.data?.transcript ?? ''}
                  onSave={(val) => updateTranscriptMutation.mutate(val)}
                  showCount={false}
                  useAutosize={false}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings tab removed for a leaner MVP */}
      </Tabs>
    </div>
  )
}

type PostsPanelProps = {
  projectId: number
  postsQuery: ProjectPostsQuery
  linkedInConnected: boolean
  onSetStatus: (postId: number, status: PostStatus) => void
  onSaveContent: (postId: number, content: string) => Promise<void> | void
  onPublish: (postId: number) => void
  onBulk: (ids: number[], status: PostStatus) => void
  onSchedule: (postId: number, scheduledAt: Date) => Promise<void>
  onUnschedule: (postId: number) => Promise<void>
  onAutoSchedule: (postId: number) => Promise<void>
  onProjectAutoSchedule: () => void
  projectAutoSchedulePending: boolean
  schedulePendingId?: number
  unschedulePendingId?: number
  autoschedulePendingId?: number
  onAllReviewed: () => void
}

function PostsPanel({
  projectId,
  postsQuery,
  linkedInConnected,
  onSetStatus,
  onSaveContent,
  onPublish,
  onBulk,
  onSchedule,
  onUnschedule,
  onAutoSchedule,
  onProjectAutoSchedule,
  projectAutoSchedulePending,
  schedulePendingId,
  unschedulePendingId,
  autoschedulePendingId,
  onAllReviewed,
}: PostsPanelProps) {
  const [selected, setSelected] = useState<number[]>([])
  const bulkRegenMutation = useBulkRegeneratePosts(projectId)
  const [regenBusy, setRegenBusy] = useState<Set<number>>(new Set())

  useEffect(() => {
    const items = postsQuery.data?.items ?? []
    if (items.length > 0 && items.every((post: Post) => post.status !== 'pending')) {
      onAllReviewed()
    }
  }, [postsQuery.data, onAllReviewed])

  if (postsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  const items: Post[] = postsQuery.data?.items ?? []
  if (items.length === 0) {
    return <div className="text-sm text-zinc-600">No posts yet.</div>
  }

  const toggleSelect = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const allIds = items.map((post) => post.id)
  const allSelected = selected.length > 0 && selected.length === items.length
  const someSelected = selected.length > 0 && selected.length < items.length
  const hasSelection = selected.length > 0

  const regenerateIds = (ids: number[]) => {
    if (!ids || ids.length === 0) {
      return
    }
    setRegenBusy((cur) => new Set([...Array.from(cur), ...ids]))
    bulkRegenMutation.mutate(
      { ids },
      {
        onSettled: () =>
          setRegenBusy((cur) => {
            const next = new Set(cur)
            for (const id of ids) {
              next.delete(id)
            }
            return next
          }),
      },
    )
  }

  

  const startConnect = async () => {
    try {
      const { url } = await linkedinClient.getAuthUrl()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to start LinkedIn OAuth'))
    }
  }

  return (
    <div className="space-y-4">
      {!linkedInConnected && (
        <div className="rounded-md border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-700">
              Connect LinkedIn to enable one-click publishing.
            </div>
            <Button size="sm" onClick={startConnect}>Connect LinkedIn</Button>
          </div>
        </div>
      )}
      {/* Unified bulk toolbar */}
      <div className="sticky top-0 z-20 flex flex-col gap-2 border-b bg-background/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            checked={allSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = someSelected
              }
            }}
            onChange={(e) => {
              if (e.target.checked) {
                setSelected(allIds)
              } else {
                setSelected([])
              }
            }}
          />
          <span>
            Select all{' '}
            {selected.length > 0 ? (
              <span className="text-zinc-500">• {selected.length} selected</span>
            ) : null}
          </span>
        </label>
        <div className="flex items-center gap-2 overflow-x-auto [&>*]:shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulk(hasSelection ? selected : allIds, 'approved')}
            disabled={items.length === 0 || (hasSelection && selected.length === 0)}
          >
            {hasSelection ? 'Approve Selected' : 'Approve All'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulk(hasSelection ? selected : allIds, 'rejected')}
            disabled={items.length === 0 || (hasSelection && selected.length === 0)}
          >
            {hasSelection ? 'Reject Selected' : 'Reject All'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => regenerateIds(hasSelection ? selected : allIds)}
            disabled={items.length === 0 || bulkRegenMutation.isPending || (hasSelection && selected.length === 0)}
          >
            {bulkRegenMutation.isPending
              ? 'Regenerating…'
              : hasSelection
                ? 'Regenerate Selected'
                : 'Regenerate All'}
          </Button>
          <Button
            size="sm"
            onClick={() => onProjectAutoSchedule()}
            disabled={!linkedInConnected || projectAutoSchedulePending}
            title={!linkedInConnected ? 'Connect LinkedIn before autoscheduling' : undefined}
          >
            {projectAutoSchedulePending ? 'Auto-scheduling…' : 'Auto-schedule Approved'}
          </Button>
        </div>
      </div>
      {/* Floating bulk bar */}
      {/* Removed separate sticky bar; unified into toolbar above */}

      <div className="mt-3 grid gap-4 md:gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        {items.map((post) => (
          <Card key={post.id} className="p-0 border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="py-3">
              <div className="flex min-w-0 items-center justify-between">
                <label className="flex items-center gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={selected.includes(post.id)}
                    onChange={() => toggleSelect(post.id)}
                  />
                  <span className="font-medium text-zinc-900">Post #{post.id}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSetStatus(post.id, 'pending')}>
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetStatus(post.id, 'approved')}>
                          Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetStatus(post.id, 'rejected')}>
                          Rejected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={post.status}
                    onValueChange={(value) => {
                      if (isModerationStatus(value)) {
                        onSetStatus(post.id, value)
                      }
                    }}
                    className="ml-2 hidden sm:flex"
                  >
                    <ToggleGroupItem value="pending" aria-label="Pending">
                      Pending
                    </ToggleGroupItem>
                    <ToggleGroupItem value="approved" aria-label="Approved">
                      Approved
                    </ToggleGroupItem>
                    <ToggleGroupItem value="rejected" aria-label="Rejected">
                      Rejected
                    </ToggleGroupItem>
                    <ToggleGroupItem value="published" aria-label="Published" disabled>
                      Published
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => regenerateIds([post.id])}
                    disabled={regenBusy.has(post.id) || bulkRegenMutation.isPending}
                  >
                    {regenBusy.has(post.id) ? 'Regenerating…' : 'Regenerate'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <TextAreaCard
                initial={post.content}
                onSave={(val) => onSaveContent(post.id, val)}
                canPublish={post.status === 'approved' && linkedInConnected}
                onPublish={() => onPublish(post.id)}
                canSchedule={post.status === 'approved' && linkedInConnected}
                scheduleInfo={{
                  scheduledAt: post.scheduledAt ?? null,
                  status: post.scheduleStatus ?? null,
                  error: post.scheduleError ?? null,
                  attemptedAt: post.scheduleAttemptedAt ?? null,
                  postStatus: post.status,
                  publishedAt: post.publishedAt ?? null,
                }}
                onSchedule={(date) => onSchedule(post.id, date)}
                onUnschedule={() => onUnschedule(post.id)}
                onAutoSchedule={() => onAutoSchedule(post.id)}
                isScheduling={schedulePendingId === post.id}
                isUnscheduling={unschedulePendingId === post.id}
                isAutoScheduling={autoschedulePendingId === post.id}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Textarea editor with autosize + clean footer
function TextAreaEditor({ initial, onSave, showCount = true, useAutosize = true }: { initial: string; onSave: (val: string) => void; showCount?: boolean; useAutosize?: boolean }) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const dirty = value !== initial
  return (
    <div>
      {useAutosize ? (
        <TextareaAutosize
          className="min-h-[200px] w-full bg-white border-zinc-200 focus-visible:ring-zinc-300"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <Textarea
          className="h-96 w-full bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
        <span className="tabular-nums text-zinc-500">{showCount ? `${value.length}/3000` : ''}</span>
        <div className="flex items-center gap-2">
          {!dirty && <span className="text-zinc-500">Saved</span>}
          <Button size="sm" variant="secondary" disabled={!dirty} onClick={() => onSave(value.slice(0, 3000))}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

type ScheduleInfo = {
  scheduledAt: Date | null
  status: PostScheduleStatus | null
  error: string | null
  attemptedAt: Date | null
  postStatus: PostStatus
  publishedAt: Date | null
}

function TextAreaCard({
  initial,
  onSave,
  canPublish,
  onPublish,
  canSchedule,
  scheduleInfo,
  onSchedule,
  onUnschedule,
  onAutoSchedule,
  isScheduling,
  isUnscheduling,
  isAutoScheduling,
}: {
  initial: string
  onSave: (val: string) => Promise<void> | void
  canPublish: boolean
  onPublish: () => void
  canSchedule: boolean
  scheduleInfo: ScheduleInfo
  onSchedule: (date: Date) => Promise<void>
  onUnschedule: () => Promise<void>
  onAutoSchedule: () => Promise<void>
  isScheduling: boolean
  isUnscheduling: boolean
  isAutoScheduling: boolean
}) {
  const [value, setValue] = useState(initial)
  const [base, setBase] = useState(initial)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setValue(initial)
    setBase(initial)
  }, [initial])
  const dirty = value !== base
  const actionsBlocked = dirty || saving
  const scheduleDisabledReason = !canSchedule
    ? scheduleInfo.postStatus === 'published'
      ? 'Post already published'
      : 'Approve the post and connect LinkedIn before scheduling'
    : actionsBlocked
      ? 'Save changes before scheduling'
      : undefined
  const isPublishing = scheduleInfo.status === 'publishing'
  const publishDisabled = !canPublish || actionsBlocked || isScheduling || isUnscheduling || isPublishing

  const handleSave = async () => {
    if (!dirty || saving) {
      return
    }
    setSaving(true)
    try {
      const maybePromise = onSave(value.slice(0, 3000))
      if (isPromiseLike<void>(maybePromise)) {
        await maybePromise
      }
      // Mark as saved locally; server refetch will also sync `initial` later
      setBase(value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <TextareaAutosize
        className="min-h-[180px] w-full bg-white border-zinc-200 focus-visible:ring-zinc-300"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-2 mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span className="tabular-nums text-zinc-500">{value.length}/3000</span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!dirty && !saving && <span className="text-zinc-500">Saved</span>}
          <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <ScheduleDialog
              disabled={!canSchedule || actionsBlocked}
              triggerTitle={scheduleDisabledReason}
              scheduleInfo={scheduleInfo}
              onSchedule={onSchedule}
              onUnschedule={onUnschedule}
              isScheduling={isScheduling}
              isUnscheduling={isUnscheduling}
            />
            {/* Desktop actions */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!canSchedule || actionsBlocked || isAutoScheduling}
                title={scheduleDisabledReason}
                onClick={() => onAutoSchedule()}
              >
                {isAutoScheduling ? 'Auto-scheduling…' : 'Auto-schedule'}
              </Button>
              <Button
                size="sm"
                variant="default"
                disabled={publishDisabled}
                title={
                  dirty
                    ? 'Please save changes before publishing'
                    : publishDisabled && (isScheduling || isUnscheduling)
                      ? 'Please wait for scheduling to complete'
                      : publishDisabled && isPublishing
                        ? 'Publishing in progress'
                        : undefined
                }
                onClick={onPublish}
              >
                Publish Now
              </Button>
            </div>
            {/* Mobile overflow menu */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!canSchedule || actionsBlocked || isAutoScheduling}
                    onClick={() => onAutoSchedule()}
                  >
                    {isAutoScheduling ? 'Auto-scheduling…' : 'Auto-schedule'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={publishDisabled}
                    onClick={() => onPublish()}
                  >
                    Publish Now
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <ScheduleSummary info={scheduleInfo} />
      </div>
    </div>
  )
}

function ScheduleSummary({ info }: { info: ScheduleInfo }) {
  if (!info) {
    return null
  }
  const { status, scheduledAt, error, attemptedAt, postStatus, publishedAt } = info
  if (postStatus === 'published') {
    return (
      <div className="text-xs text-emerald-600">
        Published{publishedAt ? ` ${format(publishedAt, 'PPpp')}` : ''}
        {publishedAt
          ? ` (${formatDistanceToNow(publishedAt, { addSuffix: true })})`
          : ''}
      </div>
    )
  }
  if (status === 'scheduled' && scheduledAt) {
    return (
      <div className="text-xs text-emerald-600">
        Scheduled for {format(scheduledAt, 'PPpp')} (
        {formatDistanceToNow(scheduledAt, { addSuffix: true })})
      </div>
    )
  }
  if (status === 'publishing') {
    return (
      <div className="space-y-1 text-xs text-sky-600">
        <div>Publishing in progress…</div>
        {scheduledAt ? (
          <div className="text-sky-500/80">
            Scheduled for {format(scheduledAt, 'PPpp')}
          </div>
        ) : null}
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="space-y-1 text-xs text-red-600">
        <div>Publish attempt failed{error ? `: ${error}` : '.'}</div>
        {attemptedAt ? (
          <div className="text-red-500/80">
            Attempted {formatDistanceToNow(attemptedAt, { addSuffix: true })}
          </div>
        ) : null}
      </div>
    )
  }
  return null
}

function ScheduleDialog({
  disabled,
  triggerTitle,
  scheduleInfo,
  onSchedule,
  onUnschedule,
  isScheduling,
  isUnscheduling,
}: {
  disabled: boolean
  triggerTitle?: string
  scheduleInfo: ScheduleInfo
  onSchedule: (date: Date) => Promise<void>
  onUnschedule: () => Promise<void>
  isScheduling: boolean
  isUnscheduling: boolean
}) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [timeValue, setTimeValue] = useState('09:00')
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const timeInputId = useId()
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  useEffect(() => {
    if (!open) {
      return
    }
    if (scheduleInfo?.scheduledAt) {
      setSelectedDate(scheduleInfo.scheduledAt)
      setTimeValue(format(scheduleInfo.scheduledAt, 'HH:mm'))
    } else {
      const nextHour = getNextHourSlot()
      const today = startOfToday()
      const nextHourDate = new Date(
        nextHour.getFullYear(),
        nextHour.getMonth(),
        nextHour.getDate(),
      )
      setSelectedDate(nextHourDate.getTime() === today.getTime() ? today : nextHourDate)
      setTimeValue(format(nextHour, 'HH:mm'))
    }
    setError(null)
  }, [open, scheduleInfo?.scheduledAt])

  const publishing = scheduleInfo?.status === 'publishing'
  const busy = working || isScheduling || isUnscheduling || publishing
  const canUnschedule = Boolean(scheduleInfo?.status || scheduleInfo?.scheduledAt)

  const handleOpenChange = (next: boolean) => {
    if (disabled && next) {
      return
    }
    setOpen(next)
    if (!next) {
      setWorking(false)
      setError(null)
    }
  }

  const handleConfirm = async () => {
    if (!selectedDate) {
      setError('Select a date')
      return
    }
    if (!timeValue) {
      setError('Enter a time')
      return
    }
    const [hoursStr, minutesStr] = timeValue.split(':')
    const hours = Number(hoursStr)
    const minutes = Number(minutesStr)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      setError('Enter a valid time')
      return
    }
    const scheduledFor = new Date(selectedDate)
    scheduledFor.setHours(hours, minutes, 0, 0)
    if (!isAfter(scheduledFor, new Date())) {
      setError('Pick a time in the future')
      return
    }
    setWorking(true)
    try {
      await onSchedule(scheduledFor)
      setOpen(false)
    } catch {
      // handled by mutation toast
    } finally {
      setWorking(false)
    }
  }

  const handleUnschedule = async () => {
    setWorking(true)
    try {
      await onUnschedule()
      setOpen(false)
    } catch {
      // handled by mutation toast
    } finally {
      setWorking(false)
    }
  }

  const triggerHint = busy
    ? publishing
      ? 'Publishing in progress'
      : 'Please wait for scheduling to complete'
    : triggerTitle

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || busy}
          title={triggerHint}
        >
          {scheduleInfo?.status === 'scheduled' && scheduleInfo?.scheduledAt
            ? 'Scheduled'
            : 'Schedule'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule post</DialogTitle>
          <DialogDescription>
            Choose a future date and time. Times use your timezone ({timezone}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => setSelectedDate(date ?? undefined)}
            disabled={(date) => date < startOfToday()}
            initialFocus
          />
          <div className="space-y-2">
            <Label htmlFor={timeInputId}>Time</Label>
            <Input
              id={timeInputId}
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {canUnschedule ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleUnschedule}
                disabled={busy}
              >
                {isUnscheduling || working ? 'Unscheduling…' : 'Unschedule'}
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Button type="button" onClick={handleConfirm} disabled={busy}>
              {isScheduling || working ? 'Scheduling…' : 'Confirm schedule'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Inline editable title with debounce autosave
function InlineTitle({
  title,
  onChange,
  onSave,
}: {
  title: string
  onChange: (val: string) => void
  onSave: (val: string) => Promise<void> | void
}) {
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => setValue(title), [title])

  useEffect(() => {
    if (value === title) {
      return
    }
    let resetTimeout: number | null = null
    const id = window.setTimeout(async () => {
      try {
        setSaving('saving')
        onChange(value)
        await onSave(value)
        setSaving('saved')
        resetTimeout = window.setTimeout(() => setSaving('idle'), 800)
      } catch {
        setSaving('idle')
      }
    }, 600)
    return () => {
      window.clearTimeout(id)
      if (resetTimeout !== null) {
        window.clearTimeout(resetTimeout)
      }
    }
  }, [onChange, onSave, title, value])

  return (
    <div className="flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-transparent text-2xl font-semibold outline-none focus:border-b focus:border-zinc-300"
      />
      <span className="text-xs text-zinc-500 min-w-16 text-right">
        {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : ''}
      </span>
    </div>
  )
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/projects/$projectId',
    // Global loading overlay handles navigation/loading states via React Query
    component: ProjectDetailPage,
    getParentRoute: () => parentRoute,
  })
