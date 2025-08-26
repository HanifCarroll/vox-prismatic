"use client"

import { useState } from "react"
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
  const columns = getColumns(onAction, loadingStates)

  const handleRowSelectionChange = (selectedRows: PostView[]) => {
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
  }

  // Transform posts to include selection state for the table
  const postsWithSelection = posts.map(post => ({
    ...post,
    isSelected: selectedPosts.includes(post.id)
  }))

  return (
    <DataTable
      columns={columns}
      data={postsWithSelection}
      searchKey="title"
      searchPlaceholder="Filter posts..."
      onRowSelectionChange={handleRowSelectionChange}
    />
  )
}