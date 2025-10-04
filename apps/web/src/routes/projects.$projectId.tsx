import { createFileRoute, useNavigate, useParams, useRouterState, redirect, isRedirect } from '@tanstack/react-router'
import { getSession } from '@/lib/session'
import { handleAuthGuardError } from '@/lib/auth-guard'
import { useEffect, useRef, useState } from 'react'
import * as projectsClient from '@/lib/client/projects'
import { useLinkedInStatus } from '@/hooks/queries/useLinkedInStatus'
import { useProjectPosts, type ProjectPostsQueryResult } from '@/hooks/queries/useProjectPosts'
import { useTranscript } from '@/hooks/queries/useTranscript'
import { useBulkSetStatus, usePublishNow, useUpdatePost, useSchedulePost, useUnschedulePost, useAutoschedulePost, useAutoscheduleProject } from '@/hooks/mutations/usePostMutations'
import { useUpdateTranscript } from '@/hooks/mutations/useTranscriptMutations'
import { useRealtimePosts } from '@/hooks/realtime/useRealtimePosts'
import { useProjectProcessingRealtime } from '@/hooks/realtime/useProjectProcessingRealtime'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import ProjectDeleteButton from '@/components/ProjectDeleteButton'
import { Input } from '@/components/ui/input'
import PostsPanel from '@/components/project/PostsPanel'
import InlineTitle from '@/components/project/InlineTitle'
import type { ProjectStage } from '@content/shared-types'
import * as postsClient from '@/lib/client/posts'
import * as transcriptsClient from '@/lib/client/transcripts'
import * as linkedinClient from '@/lib/client/linkedin'
import { toast } from 'sonner'

type ProjectPostsQuery = ProjectPostsQueryResult

function ProjectDetailPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const id = projectId
  const navigate = useNavigate({ from: '/projects/$projectId' })
  const routerState = useRouterState()
  const searchDetails = routerState.location.search
  const searchObj =
    searchDetails && typeof searchDetails === 'object' && !Array.isArray(searchDetails)
      ? (searchDetails as Record<string, unknown>)
      : undefined
  const tabParam =
    (typeof searchObj?.tab === 'string' ? searchObj.tab : undefined) ||
    new URLSearchParams(routerState.location.searchStr ?? '').get('tab')
  const urlTab: 'transcript' | 'posts' | null = tabParam === 'transcript' ? 'transcript' : tabParam === 'posts' ? 'posts' : null

  const loaderData = Route.useLoaderData() as {
    project: Awaited<ReturnType<typeof projectsClient.get>>
    posts: Awaited<ReturnType<typeof postsClient.listForProject>>
    transcript: Awaited<ReturnType<typeof transcriptsClient.get>>
    linkedIn: Awaited<ReturnType<typeof linkedinClient.getStatus>>
  }

  const [title, setTitle] = useState<string>(loaderData.project.project.title)
  const [stage, setStage] = useState<ProjectStage>(loaderData.project.project.currentStage)
  const initialProgress = loaderData.project.project.currentStage === 'processing' ? loaderData.project.project.processingProgress ?? 0 : 0
  const initialStatus = loaderData.project.project.currentStage === 'processing'
    ? (loaderData.project.project.processingStep ? String(loaderData.project.project.processingStep).replaceAll('_', ' ') : 'Starting…')
    : 'Waiting to start…'
  const [progress, setProgress] = useState<number>(initialProgress)
  const [status, setStatus] = useState<string>(initialStatus)
  const [activeTab, setActiveTab] = useState<'transcript' | 'posts'>('transcript')
  const hasQueuedRef = useRef(false)
  const hasCompletedRef = useRef(false)
  const hasFailedRef = useRef(false)
  const updatingStageRef = useRef(false)

  const { data: linkedInStatus } = useLinkedInStatus(loaderData.linkedIn)
  const [postsEnabled, setPostsEnabled] = useState(loaderData.project.project.currentStage !== 'processing')
  const postsQuery = useProjectPosts(id, postsEnabled, loaderData.posts)
  useRealtimePosts(id, loaderData.project.project.userId)
  const transcriptQuery = useTranscript(id, loaderData.transcript)
  const [transcriptValue, setTranscriptValue] = useState<string>(loaderData.transcript?.transcript ?? '')
  useEffect(() => {
    // Keep local value in sync with server data when it changes
    const next = transcriptQuery.data?.transcript ?? ''
    setTranscriptValue(next)
  }, [transcriptQuery.data?.transcript])

  useEffect(() => {
    // Only run this sync while viewing this detail route to avoid navigation churn during unmount
    const pathname = routerState.location.pathname as string
    const onDetail = pathname === `/projects/${id}`
    if (!onDetail) {
      return
    }
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
      return
    }
    if (!urlTab) {
      navigate({ to: '.', search: { tab: activeTab }, replace: true })
    }
  }, [urlTab, activeTab, id, routerState.location.pathname, navigate])

  const updatePostMutation = useUpdatePost(id)
  const bulkSetStatusMutation = useBulkSetStatus(id)
  const publishNowMutation = usePublishNow(id)
  const schedulePostMutation = useSchedulePost(id)
  const unschedulePostMutation = useUnschedulePost(id)
  const autoschedulePostMutation = useAutoschedulePost(id)
  const autoscheduleProjectMutation = useAutoscheduleProject(id)
  const updateTranscriptMutation = useUpdateTranscript(id)

  useEffect(() => {
    if (stage === 'processing') {
      setPostsEnabled(false)
      hasQueuedRef.current = false
      hasCompletedRef.current = false
      hasFailedRef.current = false
      return
    }
    setPostsEnabled(true)
    hasQueuedRef.current = false
    hasCompletedRef.current = false
    hasFailedRef.current = false
  }, [stage])

  useEffect(() => {
    if (stage !== 'processing' || hasQueuedRef.current) {
      return
    }
    hasQueuedRef.current = true
    hasCompletedRef.current = false
    hasFailedRef.current = false
    setStatus((current) => (current && current !== 'Waiting to start…' ? current : 'Starting…'))
    setProgress((current) => (current > 0 ? current : 1))
    projectsClient
      .startProcessing(id)
      .catch((error) => {
        console.error('Failed to start project processing', error)
        hasQueuedRef.current = false
        toast.error('Failed to start processing project')
      })
  }, [id, stage])

  const describeProcessingStep = (step: string): string => {
    switch (step) {
      case 'queued':
        return 'Queued'
      case 'started':
        return 'Processing started'
      case 'normalize_transcript':
        return 'Normalizing transcript'
      case 'generate_insights':
        return 'Generating insights'
      case 'insights_ready':
        return 'Insights ready'
      case 'posts_ready':
        return 'Post drafts ready'
      case 'complete':
        return 'Complete'
      default:
        return step ? step.replaceAll('_', ' ') : 'Processing…'
    }
  }

  useProjectProcessingRealtime(stage === 'processing' ? id : null, {
    enabled: stage === 'processing',
    onProgress: ({ progress: currentProgress, step }) => {
      setProgress((previous) => {
        const value = Number.isFinite(currentProgress) ? currentProgress : previous
        const clamped = Math.max(0, Math.min(99, value))
        return Math.max(previous, clamped)
      })
      if (step) {
        setStatus(describeProcessingStep(step))
        if (step === 'posts_ready') {
          setPostsEnabled(true)
        }
      }
    },
    onCompleted: () => {
      if (hasCompletedRef.current) {
        return
      }
      hasCompletedRef.current = true
      hasFailedRef.current = false
      setStatus('Complete')
      setProgress(100)
      setStage('posts')
      setActiveTab('posts')
      navigate({ to: '.', search: { tab: 'posts' } })
      setPostsEnabled(true)
      toast.success('Posts are ready for review', {
        description: 'Your content has been processed and is ready to review.',
      })
    },
    onFailed: ({ message }) => {
      if (hasFailedRef.current) {
        return
      }
      hasFailedRef.current = true
      hasCompletedRef.current = false
      setStatus(message ?? 'Processing failed')
      setPostsEnabled(false)
      toast.error(message ?? 'Processing failed')
    },
  })

  const schedulePendingId = schedulePostMutation.isPending && schedulePostMutation.variables?.postId ? schedulePostMutation.variables.postId : null
  const unschedulePendingId = unschedulePostMutation.isPending && unschedulePostMutation.variables?.postId ? unschedulePostMutation.variables.postId : null
  const autoschedulePendingId =
    autoschedulePostMutation.isPending && typeof autoschedulePostMutation.variables === 'string'
      ? (autoschedulePostMutation.variables as string)
      : null

  return (
      <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
              <div className="space-y-1">
                  <InlineTitle
                      title={title || "Untitled Project"}
                      onChange={(val) => setTitle(val)}
                      onSave={(val) =>
                          projectsClient
                              .update(id, { title: val })
                              .then(() => undefined)
                      }
                  />
                  <div className="text-sm text-zinc-600">Stage: {stage}</div>
              </div>
              <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      onClick={() => navigate({ to: "/projects" })}
                  >
                      Back to Projects
                  </Button>
                  <ProjectDeleteButton
                      projectId={id}
                      projectTitle={title || "Project"}
                      variant="destructive"
                      size="sm"
                      onDeleted={() => navigate({ to: "/projects" })}
                  />
              </div>
          </div>

          {stage === "processing" && (
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
                  <div className="mt-2 text-xs text-zinc-500">Processing.</div>
              </div>
          )}

          <Tabs
              value={activeTab}
              onValueChange={(next) => {
                  if (next === "transcript" || next === "posts") {
                      setActiveTab(next);
                      navigate({ to: ".", search: { tab: next } });
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
                      onSetStatus={(postId, status) =>
                          updatePostMutation.mutate({
                              postId,
                              data: { status },
                          })
                      }
                      onSavePost={(postId, content, hashtags) =>
                          updatePostMutation
                              .mutateAsync({
                                  postId,
                                  data: { content, hashtags },
                              })
                              .then(() => undefined)
                      }
                      onPublish={(postId) => publishNowMutation.mutate(postId)}
                      onProjectAutoSchedule={() =>
                          autoscheduleProjectMutation.mutate({})
                      }
                      projectAutoSchedulePending={
                          autoscheduleProjectMutation.isPending
                      }
                      onBulk={(ids, status) =>
                          bulkSetStatusMutation.mutate({ ids, status })
                      }
                      onSchedule={(postId, scheduledAt) =>
                          schedulePostMutation
                              .mutateAsync({ postId, scheduledAt })
                              .then(() => undefined)
                      }
                      onUnschedule={(postId) =>
                          unschedulePostMutation
                              .mutateAsync({ postId })
                              .then(() => undefined)
                      }
                      onAutoSchedule={(postId) =>
                          autoschedulePostMutation
                              .mutateAsync(postId)
                              .then(() => undefined)
                      }
                      schedulePendingId={schedulePendingId ?? undefined}
                      unschedulePendingId={unschedulePendingId ?? undefined}
                      autoschedulePendingId={autoschedulePendingId ?? undefined}
                      onAllReviewed={() => {
                          if (updatingStageRef.current || stage === "ready") {
                              return;
                          }
                          updatingStageRef.current = true;
                          projectsClient
                              .updateStage(id, { nextStage: "ready" })
                              .then(() => setStage("ready"))
                              .finally(() => {
                                  updatingStageRef.current = false;
                              });
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
                              <p className="text-sm text-zinc-600">
                                  Paste or edit your transcript. It will be
                                  cleaned and used to generate posts.
                              </p>
                              <Textarea
                                  className="h-72 w-full bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto"
                                  value={transcriptValue}
                                  onChange={(e) =>
                                      setTranscriptValue(e.target.value)
                                  }
                              />
                              <div className="flex items-center justify-end gap-2">
                                  <Button
                                      onClick={() =>
                                          updateTranscriptMutation
                                              .mutateAsync(transcriptValue)
                                              .then(() => undefined)
                                      }
                                      disabled={
                                          updateTranscriptMutation.isPending
                                      }
                                  >
                                      {updateTranscriptMutation.isPending
                                          ? "Saving…"
                                          : "Save Transcript"}
                                  </Button>
                              </div>
                          </CardContent>
                      </Card>
                  )}
              </TabsContent>
          </Tabs>
      </div>
  );
}

export const Route = createFileRoute('/projects/$projectId')({
  beforeLoad: async ({ params }) => {
    try {
      await getSession()
      if (!params.projectId) {
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
  // Block rendering until the project and related data are ready
  loader: async ({ params }) => {
    const id = params.projectId as string
    const [project, transcript, posts, linkedIn] = await Promise.all([
      projectsClient.get(id),
      transcriptsClient.get(id),
      postsClient.listForProject(id, { page: 1, pageSize: 100 }),
      linkedinClient.getStatus(),
    ])
    return { project, transcript, posts, linkedIn }
  },
  pendingMs: 0,
  pendingComponent: () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-6 w-56 bg-zinc-200 rounded" />
          <div className="h-4 w-24 bg-zinc-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-zinc-200 rounded" />
          <div className="h-8 w-28 bg-zinc-200 rounded" />
        </div>
      </div>

      <div className="rounded-md border bg-white px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="h-4 w-40 bg-zinc-200 rounded" />
          <div className="h-3 w-10 bg-zinc-100 rounded" />
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-zinc-100">
          <div className="h-full bg-zinc-200" style={{ width: '33%' }} />
        </div>
      </div>

      <div className="mt-2 h-96 w-full rounded-md border bg-white p-4">
        <div className="h-4 w-28 bg-zinc-200 rounded" />
        <div className="mt-4 h-3 w-full bg-zinc-100 rounded" />
        <div className="mt-2 h-3 w-5/6 bg-zinc-100 rounded" />
        <div className="mt-2 h-3 w-2/3 bg-zinc-100 rounded" />
      </div>
    </div>
  ),
  component: ProjectDetailPage,
})
