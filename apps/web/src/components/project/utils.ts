import { format, formatDistanceToNow, startOfToday } from 'date-fns'
import type { PostScheduleStatus, PostStatus } from '@content/shared-types'

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'error' in error) {
    const candidate = (error as { error?: unknown }).error
    if (typeof candidate === 'string') {
      return candidate
    }
  }
  return fallback
}

export const isModerationStatus = (
  value: unknown,
): value is Exclude<PostStatus, 'published'> =>
  value === 'pending' || value === 'approved' || value === 'rejected'

export const isPromiseLike = <T,>(value: unknown): value is Promise<T> =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'then' in (value as { then?: unknown }) &&
      typeof (value as { then?: unknown }).then === 'function',
  )

export const getNextHourSlot = () => {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setMinutes(0, 0, 0)
  nextHour.setHours(nextHour.getHours() + 1)
  return nextHour
}

const PARAGRAPH_SPLIT = /\n{2,}/

export const deriveHookFromContent = (content: string) => {
  if (!content) {
    return ''
  }
  const first = content.split(PARAGRAPH_SPLIT)[0]
  return (first || '').trim()
}

export const mergeHookIntoContent = (content: string, hook: string) => {
  const normalizedHook = hook.replace(/\s+/g, ' ').trim()
  if (!content) {
    return normalizedHook
  }
  const parts = content.split(PARAGRAPH_SPLIT)
  if (!parts.length) {
    return normalizedHook
  }
  parts[0] = normalizedHook
  const trimmed = parts.map((part, idx) => (idx === 0 ? part.trim() : part.trimEnd()))
  return trimmed.join('\n\n').trimEnd()
}

export type ScheduleInfo = {
  scheduledAt: Date | null
  status: PostScheduleStatus | null
  error: string | null
  attemptedAt: Date | null
  postStatus: PostStatus
  publishedAt: Date | null
}

export const formatScheduleStatus = (info: ScheduleInfo | null) => {
  if (!info) {
    return null
  }
  const { status, scheduledAt, error, attemptedAt, postStatus, publishedAt } = info
  if (postStatus === 'published') {
    return `Published${publishedAt ? ` ${format(publishedAt, 'PPpp')}` : ''}`
  }
  if (status === 'scheduled' && scheduledAt) {
    return `Scheduled for ${format(scheduledAt, 'PPpp')} (${formatDistanceToNow(scheduledAt, { addSuffix: true })})`
  }
  if (status === 'publishing') {
    return 'Publishing in progress…'
  }
  if (status === 'failed') {
    const attempt = attemptedAt ? formatDistanceToNow(attemptedAt, { addSuffix: true }) : ''
    return `Publish attempt failed${error ? `: ${error}` : '.'}${attempt ? ` (${attempt})` : ''}`
  }
  return null
}

export { startOfToday }

