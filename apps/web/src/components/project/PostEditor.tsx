import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import type { Post, PostStatus } from '@content/shared-types'
import HashtagEditor from './HashtagEditor'
import ScheduleDialog from './ScheduleDialog'
import ScheduleSummary from './ScheduleSummary'
import HookWorkbenchDrawer from './HookWorkbenchDrawer'
import type { ScheduleInfo } from './utils'
import { isModerationStatus, isPromiseLike, mergeHookIntoContent } from './utils'

export default function PostEditor({
  post,
  linkedInConnected,
  onSave,
  onSetStatus,
  onPublish,
  onSchedule,
  onUnschedule,
  onAutoSchedule,
  isScheduling,
  isUnscheduling,
  isAutoScheduling,
  onRegenerate,
  isRegenerating,
}: {
  post: Post | null
  linkedInConnected: boolean
  onSave: (content: string, hashtags: string[]) => Promise<void> | void
  onSetStatus: (status: PostStatus) => void
  onPublish: () => void
  onSchedule: (date: Date) => Promise<void>
  onUnschedule: () => Promise<void>
  onAutoSchedule: () => Promise<void>
  isScheduling: boolean
  isUnscheduling: boolean
  isAutoScheduling: boolean
  onRegenerate: () => void
  isRegenerating: boolean
}) {
  const hasPost = Boolean(post)
  const currentPost = post ?? null
  const [content, setContent] = useState(currentPost?.content ?? '')
  const [hashtags, setHashtags] = useState<string[]>(currentPost?.hashtags ?? [])
  const [baseContent, setBaseContent] = useState(currentPost?.content ?? '')
  const [baseTags, setBaseTags] = useState<string[]>(currentPost?.hashtags ?? [])
  const [saving, setSaving] = useState(false)
  const [hookWorkbenchOpen, setHookWorkbenchOpen] = useState(false)
  useEffect(() => {
    if (!currentPost) {
      return
    }
    setContent(currentPost.content)
    setHashtags(currentPost.hashtags)
    setBaseContent(currentPost.content)
    setBaseTags(currentPost.hashtags)
  }, [currentPost])

  const dirty = content !== baseContent || JSON.stringify(hashtags) !== JSON.stringify(baseTags)

  const canSchedule = hasPost && currentPost?.status === 'approved' && linkedInConnected
  const scheduleInfo = (hasPost
    ? {
        scheduledAt: currentPost?.scheduledAt ?? null,
        status: currentPost?.scheduleStatus ?? null,
        error: currentPost?.scheduleError ?? null,
        attemptedAt: currentPost?.scheduleAttemptedAt ?? null,
        postStatus: currentPost?.status ?? 'pending',
        publishedAt: currentPost?.publishedAt ?? null,
      }
    : {
        scheduledAt: null,
        status: null,
        error: null,
        attemptedAt: null,
        postStatus: 'pending' as PostStatus,
        publishedAt: null,
      }) as ScheduleInfo
  const isPublishing = scheduleInfo.status === 'publishing'
  const actionsBlocked = dirty || saving
  const scheduleDisabledReason = !canSchedule
    ? hasPost && currentPost?.status === 'published'
      ? 'Post already published'
      : 'Approve the post and connect LinkedIn before scheduling'
    : actionsBlocked
      ? 'Save changes before scheduling'
      : undefined
  const publishDisabled = !canSchedule || actionsBlocked || isScheduling || isUnscheduling || isPublishing

  const handleSave = async () => {
    if (!dirty || saving) {
      return
    }
    setSaving(true)
    try {
      const maybe = onSave(content.slice(0, 3000), hashtags)
      if (isPromiseLike<void>(maybe)) {
        await maybe
      }
      setBaseContent(content)
      setBaseTags(hashtags)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900">
              {hasPost ? '' : 'Select a post to edit'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasPost && (
              <div className="hidden sm:flex">
                <ToggleGroup
                  type="single"
                  value={currentPost?.status ?? 'pending'}
                  onValueChange={(value) => isModerationStatus(value) && onSetStatus(value)}
                >
                  <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
                  <ToggleGroupItem value="approved">Approved</ToggleGroupItem>
                  <ToggleGroupItem value="rejected">Rejected</ToggleGroupItem>
                  <ToggleGroupItem value="published" disabled>
                    Published
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => setHookWorkbenchOpen(true)} disabled={!hasPost}>
              Hook Workbench
            </Button>
            <Button size="sm" variant="secondary" onClick={onRegenerate} disabled={saving || !hasPost || isRegenerating}>
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden space-y-6">
        <div className="flex-1 min-h-0">
          <Textarea
            className="h-full w-full bg-white border-zinc-200 focus-visible:ring-zinc-300 overflow-auto resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            />
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
            <span className="tabular-nums text-zinc-500">{content.length}/3000</span>
            <div className="flex items-center gap-2">
              {!dirty && !saving && hasPost && <span className="text-zinc-500">Saved</span>}
              <Button size="sm" variant="secondary" disabled={!hasPost || !dirty || saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
        <HashtagEditor value={hashtags} onChange={setHashtags} />
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ScheduleDialog
            disabled={!hasPost || !canSchedule || actionsBlocked}
            triggerTitle={scheduleDisabledReason}
            scheduleInfo={scheduleInfo}
            onSchedule={onSchedule}
            onUnschedule={onUnschedule}
            isScheduling={isScheduling}
            isUnscheduling={isUnscheduling}
          />
          <div className="hidden sm:flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasPost || !canSchedule || actionsBlocked || isAutoScheduling}
              title={scheduleDisabledReason}
              onClick={() => onAutoSchedule()}
            >
              {isAutoScheduling ? 'Auto-scheduling…' : 'Auto-schedule'}
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={!hasPost || publishDisabled}
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
        </div>
        {hasPost && <ScheduleSummary info={scheduleInfo} />}
      </CardContent>
      <HookWorkbenchDrawer
        open={hookWorkbenchOpen}
        onOpenChange={setHookWorkbenchOpen}
        post={post}
        baseContent={content}
        onApplyHook={(hookText) =>
          setContent((current) => mergeHookIntoContent(current, hookText))
        }
      />
    </Card>
  )
}
