import { createRoute, useNavigate, useParams } from '@tanstack/react-router'
import type { RootRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as projectsClient from '@/lib/client/projects'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import { useProjectPosts } from '@/hooks/queries/useProjectPosts'
import { useTranscript } from '@/hooks/queries/useTranscript'
import { useBulkSetStatus, usePublishNow, useUpdatePost } from '@/hooks/mutations/usePostMutations'
import { useUpdateTranscript } from '@/hooks/mutations/useTranscriptMutations'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const id = useMemo(() => Number(projectId), [projectId])
  const navigate = useNavigate({ from: '/projects/$projectId' })
  const qc = useQueryClient()

  const [title, setTitle] = useState<string>('')
  const [stage, setStage] = useState<string>('processing')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('Waiting to start…')
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'transcript' | 'settings'>('overview')
  const abortRef = useRef<AbortController | null>(null)
  const updatingStageRef = useRef(false)

  // LinkedIn status
  const { data: linkedInStatus } = useLinkedInStatus()

  // Posts query
  const [postsEnabled, setPostsEnabled] = useState(false)
  const postsQuery = useProjectPosts(id, postsEnabled)

  // Transcript query
  const transcriptQuery = useTranscript(id)

  // Mutations
  const updatePostMutation = useUpdatePost(id)
  const bulkSetStatusMutation = useBulkSetStatus(id)
  const publishNowMutation = usePublishNow()
  const updateTranscriptMutation = useUpdateTranscript(id)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { project } = await projectsClient.get(id)
        if (!mounted) return
        setTitle(project.title)
        setStage(project.currentStage)
        if (project.currentStage !== 'processing') {
          setPostsEnabled(true)
        }
      } catch {
        // If we fail to load, go back to list
        navigate({ to: '/projects' })
        return
      }

      // Start processing stream immediately
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
        <div>
          <h1 className="text-2xl font-semibold">{title || 'Project'}</h1>
          <div className="text-sm text-zinc-600">Stage: {stage}</div>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: '/projects' })}>
          Back to Projects
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                <Textarea
                  className="min-h-[240px]"
                  defaultValue={transcriptQuery.data?.transcript ?? ''}
                  onChange={(e) => (transcriptRef.current = e.target.value)}
                />
                <div className="flex justify-end mt-3">
                  <Button
                    onClick={() => updateTranscriptMutation.mutate(transcriptRef.current)}
                  >
                    Save Transcript
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                Status:{' '}
                {linkedInStatus?.connected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-zinc-600">Not connected</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => onBulk(selected, 'approved')} disabled={selected.length === 0}>
          Approve Selected
        </Button>
        <Button variant="outline" onClick={() => onBulk(selected, 'rejected')} disabled={selected.length === 0}>
          Reject Selected
        </Button>
      </div>

      <div className="grid gap-3">
        {items.map((post: any) => (
          <Card key={post.id} className="p-0">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.includes(post.id)}
                    onChange={() => toggleSelect(post.id)}
                  />
                  <span className="text-sm text-zinc-600">Post #{post.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={post.status} />
                  <Button variant="outline" size="sm" onClick={() => onSetStatus(post.id, 'approved')}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onSetStatus(post.id, 'rejected')}>
                    Reject
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                defaultValue={post.content}
                className="min-h-[160px]"
                onChange={(e) => (post.__draft = e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>{(post.__draft?.length ?? post.content.length)}/3000</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onSaveContent(post.id, (post.__draft ?? post.content).slice(0, 3000))}
                  >
                    Save
                  </Button>
                  <Button
                    disabled={post.status !== 'approved' || !linkedInConnected}
                    onClick={() => onPublish(post.id)}
                  >
                    Publish Now
                  </Button>
                </div>
              </div>
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

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/projects/$projectId',
    component: ProjectDetailPage,
    getParentRoute: () => parentRoute,
  })
