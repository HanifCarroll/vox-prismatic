import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Post, PostStatus } from '@/api/types'
import { toast } from 'sonner'
import { linkedInAuth0 } from '@/api/linked-in/linked-in'
import { useBulkRegeneratePosts } from '@/hooks/mutations/usePostMutations'
import type { ProjectPostsQueryResult } from '@/hooks/queries/useProjectPosts'
import PostQueue from './PostQueue'
import PostEditor from './PostEditor'
import { getApiErrorMessage } from './utils'
import RegenerateModal from './RegenerateModal'
import type { PostTypePreset } from '@/api/types'

export type PostsPanelProps = {
  projectId: string
  postsQuery: ProjectPostsQueryResult
  linkedInConnected: boolean
  onSetStatus: (postId: string, status: PostStatus) => void
  onSavePost: (postId: string, content: string, hashtags: string[]) => Promise<void> | void
  onPublish: (postId: string) => void
  onBulk: (ids: string[], status: PostStatus) => void
  onSchedule: (postId: string, scheduledAt: Date) => Promise<void>
  onUnschedule: (postId: string) => Promise<void>
  onAutoSchedule: (postId: string) => Promise<void>
  onProjectAutoSchedule: () => void
  projectAutoSchedulePending: boolean
  schedulePendingId?: string
  unschedulePendingId?: string
  autoschedulePendingId?: string
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
  const [selected, setSelected] = useState<string[]>([])
  const bulkRegenMutation = useBulkRegeneratePosts(projectId)
  const [regenBusy, setRegenBusy] = useState<Set<string>>(new Set())
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenIds, setRegenIds] = useState<string[] | null>(null)

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
      const firstPost = items[0]
      if (firstPost) {
        setSelectedPostId(firstPost.id)
      }
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

  const toggleSelect = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const allIds = items.map((post) => post.id)
  const allSelected = selected.length > 0 && selected.length === items.length
  const someSelected = selected.length > 0 && selected.length < items.length
  const hasSelection = selected.length > 0

  const openRegenerate = (ids: string[]) => {
    setRegenIds(ids)
    setRegenOpen(true)
  }

  const submitRegenerate = ({ customInstructions, postType }: { customInstructions?: string; postType?: PostTypePreset }) => {
    const ids = regenIds || []
    if (!ids.length) {
      return
    }
    setRegenBusy((cur) => new Set([...Array.from(cur), ...ids]))
    bulkRegenMutation.mutate(
      { ids, customInstructions, postType },
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
      const { url } = await linkedInAuth0()
      window.location.href = url
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to start LinkedIn OAuth'))
    }
  }

  const anyRegenInProgress = bulkRegenMutation.isPending || regenBusy.size > 0

  return (
    <>
    <div className="space-y-4">
      {!linkedInConnected && (
        <div className="rounded-md border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-700">Connect LinkedIn to enable one-click publishing.</div>
            <Button size="sm" onClick={startConnect}>Connect LinkedIn</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
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
            onClick={() => openRegenerate(hasSelection ? selected : allIds)}
            disabled={
              items.length === 0 || anyRegenInProgress || (hasSelection && selected.length === 0)
            }
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
              if (!id) {
                return
              }
              return onSavePost(id, content, hashtags)
            }}
            onSetStatus={(status) => {
              const id = selectedPostId
              if (!id) {
                return
              }
              onSetStatus(id, status)
            }}
            onPublish={() => {
              const id = selectedPostId
              if (!id) {
                return
              }
              onPublish(id)
            }}
            onSchedule={(date) => {
              const id = selectedPostId
              if (!id) {
                return Promise.resolve()
              }
              return onSchedule(id, date)
            }}
            onUnschedule={() => {
              const id = selectedPostId
              if (!id) {
                return Promise.resolve()
              }
              return onUnschedule(id)
            }}
            onAutoSchedule={() => {
              const id = selectedPostId
              if (!id) {
                return Promise.resolve()
              }
              return onAutoSchedule(id)
            }}
            isScheduling={schedulePendingId === selectedPostId}
            isUnscheduling={unschedulePendingId === selectedPostId}
            isAutoScheduling={autoschedulePendingId === selectedPostId}
            isRegenerating={selectedPostId != null ? regenBusy.has(selectedPostId) || bulkRegenMutation.isPending : false}
            onRegenerate={() => {
              const id = selectedPostId
              if (!id) {
                return
              }
              openRegenerate([id])
            }}
          />
        </div>
      </div>
    </div>
    <RegenerateModal open={regenOpen} onOpenChange={setRegenOpen} onSubmit={submitRegenerate} disabled={anyRegenInProgress} />
    </>
  )
}
