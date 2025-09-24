import React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import type { ScheduleInfo } from './utils'

export default function ScheduleSummary({ info }: { info: ScheduleInfo }) {
  if (!info) {
    return null
  }
  const { status, scheduledAt, error, attemptedAt, postStatus, publishedAt } = info
  if (postStatus === 'published') {
    return (
      <div className="text-xs text-emerald-600">
        Published{publishedAt ? ` ${format(publishedAt, 'PPpp')}` : ''}
        {publishedAt ? ` (${formatDistanceToNow(publishedAt, { addSuffix: true })})` : ''}
      </div>
    )
  }
  if (status === 'scheduled' && scheduledAt) {
    return (
      <div className="text-xs text-emerald-600">
        Scheduled for {format(scheduledAt, 'PPpp')} ({formatDistanceToNow(scheduledAt, { addSuffix: true })})
      </div>
    )
  }
  if (status === 'publishing') {
    return (
      <div className="space-y-1 text-xs text-sky-600">
        <div>Publishing in progress…</div>
        {scheduledAt ? (
          <div className="text-sky-500/80">Scheduled for {format(scheduledAt, 'PPpp')}</div>
        ) : null}
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="space-y-1 text-xs text-red-600">
        <div>Publish attempt failed{error ? `: ${error}` : '.'}</div>
        {attemptedAt ? (
          <div className="text-red-500/80">Attempted {formatDistanceToNow(attemptedAt, { addSuffix: true })}</div>
        ) : null}
      </div>
    )
  }
  return null
}

