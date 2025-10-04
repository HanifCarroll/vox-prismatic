import { useEffect, useRef } from 'react'
import { getEcho } from '@/lib/realtime/echo'

type ProgressPayload = {
  projectId: string
  progress: number
  step: string
}

type FailurePayload = {
  projectId: string
  message?: string
}

type Options = {
  enabled?: boolean
  onProgress?: (payload: ProgressPayload) => void
  onCompleted?: (payload: { projectId: string }) => void
  onFailed?: (payload: FailurePayload) => void
}

export function useProjectProcessingRealtime(projectId: string | null | undefined, options: Options = {}) {
  const { enabled = true } = options
  const handlersRef = useRef<Options>({})

  useEffect(() => {
    handlersRef.current = options
  }, [options])

  useEffect(() => {
    if (!enabled || !projectId) {
      return undefined
    }

    try {
      const echo = getEcho()
      const channel = echo.private(`project.${projectId}`)

      const handleProgress = (payload: Partial<ProgressPayload>) => {
        if (payload.projectId && payload.projectId !== projectId) {
          return
        }
        handlersRef.current.onProgress?.({
          projectId,
          progress: typeof payload.progress === 'number' ? payload.progress : 0,
          step: typeof payload.step === 'string' ? payload.step : '',
        })
      }

      const handleCompleted = (payload: { projectId?: string }) => {
        if (payload.projectId && payload.projectId !== projectId) {
          return
        }
        handlersRef.current.onCompleted?.({ projectId })
      }

      const handleFailed = (payload: FailurePayload) => {
        if (payload.projectId && payload.projectId !== projectId) {
          return
        }
        handlersRef.current.onFailed?.({
          projectId,
          message: typeof payload.message === 'string' ? payload.message : undefined,
        })
      }

      channel.listen('.project.progress', handleProgress)
      channel.listen('.project.completed', handleCompleted)
      channel.listen('.project.failed', handleFailed)

      return () => {
        channel.stopListening('.project.progress')
        channel.stopListening('.project.completed')
        channel.stopListening('.project.failed')
        echo.leave(`project.${projectId}`)
      }
    } catch (error) {
      console.error('Failed to subscribe to project channel', error)
      return undefined
    }
  }, [enabled, projectId])
}
