import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Post, PostStatus } from '@content/shared-types'
import { toast } from 'sonner'
import * as linkedinClient from '@/lib/client/linkedin'
import { useBulkRegeneratePosts } from '@/hooks/mutations/usePostMutations'
import type { ProjectPostsQueryResult } from '@/hooks/queries/useProjectPosts'
import PostQueue from './PostQueue'
import PostEditor from './PostEditor'
import { getApiErrorMessage } from './utils'

export type PostsPanelProps = {
  projectId: number
  postsQuery: ProjectPostsQueryResult
  linkedInConnected: boolean
  onSetStatus: (postId: number, status: PostStatus) => void
  onSavePost: (postId: number, content: string, hashtags: string[]) => Promise<void> | void
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

export default function PostsPanel({
  projectId,
  postsQuery,
  linkedInConnected,
  onSetStatus,
  onSavePost,
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
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)

  // Compute items early so hooks can depend on it
  const items: Post[] = postsQuery.data?.items ?? []

  // Call hooks unconditionally and in stable order
  useEffect(() => {
    if (items.length > 0 && items.every((post: Post) => post.status !== 'pending')) {
      onAllReviewed()
    }
  }, [items, onAllReviewed])

  useEffect(() => {
    if (selectedPostId === null && items.length > 0) {
      setSelectedPostId(items[0]!.id)
    }
  }, [items, selectedPostId])

  if (postsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

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
            <div className="text-sm text-zinc-700">Connect LinkedIn to enable one-click publishing.</div>
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
            {hasSelection ? `${selected.length} selected` : `${items.length} posts`}
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onBulk(hasSelection ? selected : allIds, 'approved')}
            disabled={items.length === 0 || (hasSelection && selected.length === 0)}
          >
            {hasSelection ? 'Approve Selected' : 'Approve All'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulk(hasSelection ? selected : allIds, 'pending')}
            disabled={items.length === 0 || (hasSelection && selected.length === 0)}
          >
            {hasSelection ? 'Mark Pending' : 'Mark All Pending'}
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

      {/* Two-pane layout: left queue, right editor */}
      <div className="mt-3 flex gap-4 h-[calc(100vh-240px)] min-h-[360px] overflow-hidden">
        <div className="w-80 shrink-0 h-full overflow-y-auto border rounded-md bg-white">
          <PostQueue
            posts={items}
            selectedPostId={selectedPostId}
            selectedSet={new Set(selected)}
            onSelect={(id) => setSelectedPostId(id)}
            onToggleSelect={(id) => toggleSelect(id)}
          />
        </div>
        <div className="flex-1 h-full overflow-hidden">
          <PostEditor
            post={items.find((p) => p.id === selectedPostId) ?? null}
            linkedInConnected={linkedInConnected}
            onSave={(content, hashtags) => {
              const id = selectedPostId
              if (!id) return
              return onSavePost(id, content, hashtags)
            }}
            onSetStatus={(status) => {
              const id = selectedPostId
              if (!id) return
              onSetStatus(id, status)
            }}
            onPublish={() => {
              const id = selectedPostId
              if (!id) return
              onPublish(id)
            }}
            onSchedule={(date) => {
              const id = selectedPostId
              if (!id) return Promise.resolve()
              return onSchedule(id, date)
            }}
            onUnschedule={() => {
              const id = selectedPostId
              if (!id) return Promise.resolve()
              return onUnschedule(id)
            }}
            onAutoSchedule={() => {
              const id = selectedPostId
              if (!id) return Promise.resolve()
              return onAutoSchedule(id)
            }}
            isScheduling={schedulePendingId === selectedPostId}
            isUnscheduling={unschedulePendingId === selectedPostId}
            isAutoScheduling={autoschedulePendingId === selectedPostId}
            onRegenerate={() => {
              const id = selectedPostId
              if (!id) return
              regenerateIds([id])
            }}
          />
        </div>
      </div>
    </div>
  )
}
