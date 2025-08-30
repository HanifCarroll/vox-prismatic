
import { useMemo, useCallback } from "react"
import { DataTable } from "@/components/ui/data-table"
import { getColumns } from "./columns"
import type { PostView } from "@/types"

interface PostsDataTableProps {
  posts: PostView[]
  selectedPosts: string[]
  onSelect: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onAction: (action: string, post: PostView) => void
  loadingStates?: Record<string, boolean>
}

export function PostsDataTable({
  posts,
  selectedPosts,
  onSelect,
  onSelectAll,
  onAction,
  loadingStates = {},
}: PostsDataTableProps) {
  // Memoize columns to prevent recreation on every render
  const columns = useMemo(() => getColumns(onAction, loadingStates), [onAction, loadingStates])

  // Memoize the row selection handler to prevent infinite re-renders
  const handleRowSelectionChange = useCallback((selectedRows: PostView[]) => {
    // Clear current selection
    const currentSelected = new Set(selectedPosts)
    posts.forEach(post => {
      if (currentSelected.has(post.id) && !selectedRows.some(row => row.id === post.id)) {
        onSelect(post.id, false)
      }
    })

    // Add new selections
    selectedRows.forEach(row => {
      if (!currentSelected.has(row.id)) {
        onSelect(row.id, true)
      }
    })
  }, [selectedPosts, posts, onSelect])

  // Memoize transformed data to prevent unnecessary recalculations
  const postsWithSelection = useMemo(() => 
    posts.map(post => ({
      ...post,
      isSelected: selectedPosts.includes(post.id)
    })), [posts, selectedPosts]
  )

  return (
    <DataTable
      columns={columns}
      data={postsWithSelection}
      onRowSelectionChange={handleRowSelectionChange}
    />
  )
}