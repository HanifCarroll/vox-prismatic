import { createRoute, useNavigate, useParams, useLoaderData } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as projectsClient from '@/lib/client/projects'
import * as linkedinClient from '@/lib/client/linkedin'
import * as transcriptsClient from '@/lib/client/transcripts'
import * as postsClient from '@/lib/client/posts'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import { useProjectPosts } from '@/hooks/queries/useProjectPosts'
import { useTranscript } from '@/hooks/queries/useTranscript'
import { useBulkSetStatus, usePublishNow, useUpdatePost, useBulkRegeneratePosts } from '@/hooks/mutations/usePostMutations'
import { useUpdateTranscript } from '@/hooks/mutations/useTranscriptMutations'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TextareaAutosize } from '@/components/ui/textarea-autosize'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'motion/react'
import { LoadingOverlay } from '@/components/LoadingOverlay'

function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const loader = useLoaderData({}) as
    | {
        project: { id: number; title: string; currentStage: string }
        status?: { connected: boolean }
        transcript?: { transcript: string | null }
        posts?: { items: any[]; meta: { page: number; pageSize: number; total: number } }
      }
    | undefined
  const id = useMemo(() => Number(projectId), [projectId])
  const navigate = useNavigate({ from: '/projects/$projectId' })
  const qc = useQueryClient()

  const [title, setTitle] = useState<string>(loader?.project.title ?? '')
  const [stage, setStage] = useState<string>(loader?.project.currentStage ?? 'processing')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('Waiting to start…')
  const [activeTab, setActiveTab] = useState<'transcript' | 'posts'>('transcript')
  const abortRef = useRef<AbortController | null>(null)
  const updatingStageRef = useRef(false)

  // LinkedIn status
  const { data: linkedInStatus } = useLinkedInStatus(loader?.status)

  // Posts query
  const [postsEnabled, setPostsEnabled] = useState(Boolean(loader?.posts))
  const postsQuery = useProjectPosts(id, postsEnabled, loader?.posts)

  // Transcript query
  const transcriptQuery = useTranscript(id, loader?.transcript)

  // Mutations
  const updatePostMutation = useUpdatePost(id)
  const bulkSetStatusMutation = useBulkSetStatus(id)
  const publishNowMutation = usePublishNow()
  const updateTranscriptMutation = useUpdateTranscript(id)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!loader?.project) {
        navigate({ to: '/projects' })
        return
      }
      if (!mounted) return
      setTitle(loader.project.title)
      setStage(loader.project.currentStage)
      if (loader.project.currentStage !== 'processing') {
        setPostsEnabled(true)
        setActiveTab('transcript')
        return
      }

      // Only start processing stream when in processing stage
      const ac = new AbortController()
      abortRef.current = ac
      setStatus('Starting…')
      setProgress(1)
      try {
        await projectsClient.processStream(id, ({ event, data }) => {
          switch (event) {
            case 'started':
              setStatus('Processing started')
              setProgress(5)
              break
            case 'progress':
              if (typeof data?.progress === 'number') setProgress(Math.max(5, Math.min(99, data.progress)))
              if (data?.step) setStatus(String(data.step).replaceAll('_', ' '))
              break
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
      } catch {
        if (!mounted) return
        setStatus('Failed to start processing')
      }
    })()

    return () => {
      mounted = false
      abortRef.current?.abort()
    }
  }, [id, navigate])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <InlineTitle
            title={title || 'Untitled Project'}
            onChange={(val) => setTitle(val)}
            onSave={(val) => projectsClient.update(id, { title: val })}
          />
          <div className="text-sm text-zinc-600">Stage: {stage}</div>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: '/projects' })}>
          Back to Projects
        </Button>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
            stage={stage}
            postsQuery={postsQuery}
            linkedInConnected={!!linkedInStatus?.connected}
            onSetStatus={(postId, status) =>
              updatePostMutation.mutate({ postId, data: { status } })
            }
            onSaveContent={(postId, content) =>
              updatePostMutation.mutate({ postId, data: { content } })
            }
            onPublish={(postId) => publishNowMutation.mutate(postId)}
            onBulk={(ids, status) => bulkSetStatusMutation.mutate({ ids, status })}
            onAllReviewed={() => {
              if (updatingStageRef.current || stage === 'ready') return
              updatingStageRef.current = true
              projectsClient
                .updateStage(id, { nextStage: 'ready' })
                .then(() => setStage('ready'))
                .finally(() => (updatingStageRef.current = false))
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

// Local ref for transcript editing
const transcriptRef: { current: string } = { current: '' }

type PostsPanelProps = {
  projectId: number
  stage: string
  postsQuery: ReturnType<typeof useQuery<any, any, any, any>>
  linkedInConnected: boolean
  onSetStatus: (postId: number, status: 'pending' | 'approved' | 'rejected') => void
  onSaveContent: (postId: number, content: string) => void
  onPublish: (postId: number) => void
  onBulk: (ids: number[], status: 'pending' | 'approved' | 'rejected') => void
  onAllReviewed: () => void
}

function PostsPanel({
  projectId,
  stage,
  postsQuery,
  linkedInConnected,
  onSetStatus,
  onSaveContent,
  onPublish,
  onBulk,
  onAllReviewed,
}: PostsPanelProps) {
  const [selected, setSelected] = useState<number[]>([])
  const bulkRegenMutation = useBulkRegeneratePosts(projectId)

  useEffect(() => {
    const items = postsQuery.data?.items || []
    if (items.length > 0 && items.every((p: any) => p.status !== 'pending')) {
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

  const items = postsQuery.data?.items || []
  if (items.length === 0) {
    return <div className="text-sm text-zinc-600">No posts yet.</div>
  }

  const toggleSelect = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const allIds = items.map((p: any) => p.id)
  const allSelected = selected.length > 0 && selected.length === items.length
  const someSelected = selected.length > 0 && selected.length < items.length

  const hasSelection = selected.length > 0

  return (
    <div className="space-y-4">
      {/* Unified bulk toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={(e) => {
              if (e.target.checked) setSelected(allIds)
              else setSelected([])
            }}
          />
          <span>
            Select all{' '}
            {selected.length > 0 ? (
              <span className="text-zinc-500">• {selected.length} selected</span>
            ) : null}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => bulkRegenMutation.mutate({ ids: hasSelection ? selected : allIds })}
            disabled={items.length === 0 || bulkRegenMutation.isPending || (hasSelection && selected.length === 0)}
          >
            {bulkRegenMutation.isPending
              ? 'Regenerating…'
              : hasSelection
                ? 'Regenerate Selected'
                : 'Regenerate All'}
          </Button>
        </div>
      </div>
      {/* Floating bulk bar */}
      {/* Removed separate sticky bar; unified into toolbar above */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((post: any) => (
          <Card key={post.id} className="p-0 border-zinc-200 shadow-sm">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={selected.includes(post.id)}
                    onChange={() => toggleSelect(post.id)}
                  />
                  <span className="font-medium text-zinc-900">Post #{post.id}</span>
                </label>
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={post.status}
                    onValueChange={(v) => v && onSetStatus(post.id, v as any)}
                    className="ml-2"
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
                  </ToggleGroup>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <TextAreaCard
                initial={post.content}
                onSave={(val) => onSaveContent(post.id, val)}
                canPublish={post.status === 'approved' && linkedInConnected}
                onPublish={() => onPublish(post.id)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map: Record<typeof status, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    approved: { variant: 'default', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  }
  const conf = map[status]
  return <Badge variant={conf.variant}>{conf.label}</Badge>
}

// Textarea editor with autosize + clean footer
function TextAreaEditor({ initial, onSave, showCount = true, useAutosize = true }: { initial: string; onSave: (val: string) => void; showCount?: boolean; useAutosize?: boolean }) {
  const [value, setValue] = useState(initial)
  const dirty = value !== initial
  return (
    <div>
      {useAutosize ? (
        <TextareaAutosize
          className="min-h-[200px] bg-white border-zinc-200 focus-visible:ring-zinc-300"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <Textarea
          className="h-96 bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto"
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

function TextAreaCard({
  initial,
  onSave,
  canPublish,
  onPublish,
}: {
  initial: string
  onSave: (val: string) => void
  canPublish: boolean
  onPublish: () => void
}) {
  const [value, setValue] = useState(initial)
  const dirty = value !== initial
  return (
    <div>
      <TextareaAutosize
        className="min-h-[180px] bg-white border-zinc-200 focus-visible:ring-zinc-300"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-2 mb-4 flex items-center justify-between text-xs text-zinc-600">
        <span className="tabular-nums text-zinc-500">{value.length}/3000</span>
        <div className="flex items-center gap-2">
          {!dirty && <span className="text-zinc-500">Saved</span>}
          <Button size="sm" variant="secondary" disabled={!dirty} onClick={() => onSave(value.slice(0, 3000))}>
            Save
          </Button>
          <Button size="sm" variant="default" disabled={!canPublish} onClick={onPublish}>
            Publish Now
          </Button>
        </div>
      </div>
    </div>
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
  onSave: (val: string) => Promise<any> | void
}) {
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => setValue(title), [title])

  useEffect(() => {
    if (value === title) return
    const id = setTimeout(async () => {
      try {
        setSaving('saving')
        onChange(value)
        await onSave(value)
        setSaving('saved')
        setTimeout(() => setSaving('idle'), 800)
      } catch {
        setSaving('idle')
      }
    }, 600)
    return () => clearTimeout(id)
  }, [value])

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
    loader: async ({ params }) => {
      const id = Number(params.projectId)
      const { project } = await projectsClient.get(id)
      // Parallelize secondary data: status, transcript, posts (conditional)
      const promises: Promise<any>[] = [
        linkedinClient.getStatus().catch(() => ({ connected: false })),
        transcriptsClient.get(id).catch(() => ({ transcript: '' })),
      ]
      if (project.currentStage !== 'processing') {
        promises.push(postsClient.listForProject(id, { page: 1, pageSize: 100 }).catch(() => ({ items: [], meta: { page: 1, pageSize: 100, total: 0 } })))
      }
      const [status, transcript, posts] = await Promise.all(promises).then((arr) => [arr[0], arr[1], arr[2]])
      return { project, status, transcript, posts }
    },
    pendingMs: 200,
    pendingMinMs: 500,
    pendingComponent: () => <LoadingOverlay message="Preparing your project…" />,
    component: ProjectDetailPage,
    getParentRoute: () => parentRoute,
  })
