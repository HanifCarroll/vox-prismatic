import { createRoute, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as projectsClient from '@/lib/client/projects'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import { useProjectPosts, type ProjectPostsQueryResult } from '@/hooks/queries/useProjectPosts'
import { useTranscript } from '@/hooks/queries/useTranscript'
import { useBulkSetStatus, usePublishNow, useUpdatePost, useSchedulePost, useUnschedulePost, useAutoschedulePost, useAutoscheduleProject } from '@/hooks/mutations/usePostMutations'
import { useUpdateTranscript } from '@/hooks/mutations/useTranscriptMutations'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import ProjectDeleteButton from '@/components/ProjectDeleteButton'
import { Input } from '@/components/ui/input'
import PostsPanel from './project/PostsPanel'
import InlineTitle from './project/InlineTitle'
import type { ProjectStage } from '@content/shared-types'

type ProjectPostsQuery = ProjectPostsQueryResult

function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const id = useMemo(() => Number(projectId), [projectId])
  const navigate = useNavigate({ from: '/projects/$projectId' })
  const routerState = useRouterState()
  const searchObj = (routerState.location as any)?.search || {}
  const tabParam = (searchObj as any).tab || new URLSearchParams(routerState.location.searchStr || '').get('tab')
  const urlTab: 'transcript' | 'posts' | null = tabParam === 'transcript' ? 'transcript' : tabParam === 'posts' ? 'posts' : null

  const projectQuery = useQuery({ queryKey: ['project', id], queryFn: () => projectsClient.get(id), enabled: !!id })

  const [title, setTitle] = useState<string>('')
  const [stage, setStage] = useState<ProjectStage>('processing')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('Waiting to start…')
  const [activeTab, setActiveTab] = useState<'transcript' | 'posts'>('transcript')
  const abortRef = useRef<AbortController | null>(null)
  const updatingStageRef = useRef(false)

  const { data: linkedInStatus } = useLinkedInStatus()
  const [postsEnabled, setPostsEnabled] = useState(false)
  const postsQuery = useProjectPosts(id, postsEnabled)
  const transcriptQuery = useTranscript(id)

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
    if (!p) return
    setTitle(p.title)
    setStage(p.currentStage)
    if (p.currentStage !== 'processing') setPostsEnabled(true)
  }, [projectQuery.data])

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
      if (!projectQuery.data?.project) return
      if (!mounted) return
      const proj = projectQuery.data.project
      setTitle(proj.title)
      setStage(proj.currentStage)
      if (proj.currentStage !== 'processing') {
        setPostsEnabled(true)
        return
      }
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
                  const progressData = data && typeof data === 'object' ? (data as { progress?: number; step?: string }) : {}
                  if (typeof progressData.progress === 'number') setProgress(Math.max(5, Math.min(99, progressData.progress)))
                  if (progressData.step) setStatus(String(progressData.step).replaceAll('_', ' '))
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
            if (mounted && !ac.signal.aborted && stage === 'processing') {
              setStatus('Reconnecting…')
              await new Promise<void>((resolve) => setTimeout(resolve, 1000))
              continue
            }
            break
          } catch {
            if (!mounted || ac.signal.aborted) break
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

  const schedulePendingId = schedulePostMutation.isPending && schedulePostMutation.variables?.postId ? schedulePostMutation.variables.postId : null
  const unschedulePendingId = unschedulePostMutation.isPending && unschedulePostMutation.variables?.postId ? unschedulePostMutation.variables.postId : null
  const autoschedulePendingId = autoschedulePostMutation.isPending && typeof autoschedulePostMutation.variables === 'number' ? (autoschedulePostMutation.variables as number) : null

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

      {stage === 'processing' && (
        <div className="mt-2 rounded-md border bg-white px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium text-zinc-800">{status}</div>
            <div className="text-xs text-zinc-500">{progress}%</div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-zinc-100">
            <div className="h-full bg-zinc-800 transition-all" style={{ width: `${progress}%` }} />
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

        <TabsContent value="posts" className="mt-4 space-y-3">
          <PostsPanel
            projectId={id}
            postsQuery={postsQuery}
            linkedInConnected={!!linkedInStatus?.connected}
            onSetStatus={(postId, status) => updatePostMutation.mutate({ postId, data: { status } })}
            onSavePost={(postId, content, hashtags) =>
              updatePostMutation.mutateAsync({ postId, data: { content, hashtags } }).then(() => undefined)
            }
            onPublish={(postId) => publishNowMutation.mutate(postId)}
            onProjectAutoSchedule={() => autoscheduleProjectMutation.mutate({})}
            projectAutoSchedulePending={autoscheduleProjectMutation.isPending}
            onBulk={(ids, status) => bulkSetStatusMutation.mutate({ ids, status })}
            onSchedule={(postId, scheduledAt) => schedulePostMutation.mutateAsync({ postId, scheduledAt }).then(() => undefined)}
            onUnschedule={(postId) => unschedulePostMutation.mutateAsync({ postId }).then(() => undefined)}
            onAutoSchedule={(postId) => autoschedulePostMutation.mutateAsync(postId).then(() => undefined)}
            schedulePendingId={schedulePendingId ?? undefined}
            unschedulePendingId={unschedulePendingId ?? undefined}
            autoschedulePendingId={autoschedulePendingId ?? undefined}
            onAllReviewed={() => {
              if (updatingStageRef.current || stage === 'ready') return
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
                <CardTitle>Transcript</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-600">Paste or edit your transcript. It will be cleaned and used to generate posts.</p>
                <Textarea
                  className="h-72 w-full bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto"
                  value={transcriptQuery.data?.transcript?.transcriptOriginal || ''}
                  onChange={(e) => updateTranscriptMutation.setLocal(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    onClick={() =>
                      updateTranscriptMutation
                        .mutateAsync({ transcript: updateTranscriptMutation.value })
                        .then(() => undefined)
                    }
                    disabled={updateTranscriptMutation.isPending}
                  >
                    {updateTranscriptMutation.isPending ? 'Saving…' : 'Save Transcript'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default (parentRoute: AnyRoute) =>
  createRoute({
    path: '/projects/$projectId',
    component: ProjectDetailPage,
    getParentRoute: () => parentRoute,
  })

