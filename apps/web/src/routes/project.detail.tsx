import { createRoute, useNavigate, useParams } from '@tanstack/react-router'
import type { RootRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as projectsClient from '@/lib/client/projects'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

function ProjectDetailPage() {
  const { projectId } = useParams({ from: '/projects/$projectId' }) as { projectId: string }
  const id = useMemo(() => Number(projectId), [projectId])
  const navigate = useNavigate({ from: '/projects/$projectId' })

  const [title, setTitle] = useState<string>('')
  const [stage, setStage] = useState<string>('processing')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('Waiting to start…')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { project } = await projectsClient.get(id)
        if (!mounted) return
        setTitle(project.title)
        setStage(project.currentStage)
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
              break
            case 'complete':
              setStatus('Complete')
              setProgress(100)
              setStage('posts')
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

      <div className="space-y-2">
        <div className="text-sm text-zinc-700">{status}</div>
        <Progress value={progress} />
      </div>

      <div className="text-xs text-zinc-500">
        Processing uses SSE. This view updates as events arrive.
      </div>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/projects/$projectId',
    component: ProjectDetailPage,
    getParentRoute: () => parentRoute,
  })

