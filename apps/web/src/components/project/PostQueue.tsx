import React from 'react'
import type { Post } from '@/api/types'

export function PostQueue({
  posts,
  selectedPostId,
  selectedSet,
  onSelect,
  onToggleSelect,
}: {
  posts: Post[]
  selectedPostId: string | null
  selectedSet: Set<string>
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
}) {
  return (
    <div className="divide-y">
      {posts.map((post) => {
        const active = post.id === selectedPostId
        return (
          <button
            key={post.id}
            type="button"
            className={`flex w-full items-start gap-2 px-3 py-3 text-left hover:bg-zinc-50 ${active ? 'bg-zinc-50 border-l-2 border-zinc-300' : ''}`}
            onClick={() => onSelect(post.id)}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-zinc-300"
              checked={selectedSet.has(post.id)}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect(post.id)
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs rounded px-1.5 py-0.5 border text-zinc-700 bg-zinc-50">
                  {post.status}
                </span>
                {post.scheduleStatus ? (
                  <span className="text-[10px] rounded px-1 py-0.5 border text-sky-700 bg-sky-50">
                    {post.scheduleStatus}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 line-clamp-2 text-sm text-zinc-800">
                {(post.content || '').slice(0, 160) || '—'}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default PostQueue
