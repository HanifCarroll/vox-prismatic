"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Calendar, Edit3, Check, X, Archive, Eye } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { CharacterCount } from "@/components/CharacterCount"
import { getPlatformConfig } from "@/constants/platforms"
import type { PostView } from "@/types"

interface PostActionsProps {
  post: PostView
  onAction: (action: string, post: PostView) => void
  loadingStates?: Record<string, boolean>
}

function PostActions({ post, onAction, loadingStates = {} }: PostActionsProps) {
  const isActionLoading = (action: string) => loadingStates[`${action}-${post.id}`] || false

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAction('view', post)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('edit', post)}>
          <Edit3 className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {post.status === 'needs_review' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onAction('approve', post)}
              disabled={isActionLoading('approve')}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onAction('reject', post)}
              disabled={isActionLoading('reject')}
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        {post.status === 'approved' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('schedule', post)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction('archive', post)}>
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(
  onAction: (action: string, post: PostView) => void,
  loadingStates: Record<string, boolean> = {}
): ColumnDef<PostView>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center" title="Use Smart Select for advanced selection options">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => {
        const post = row.original
        return (
          <div className="max-w-[300px]">
            <div className="font-medium truncate" title={post.title}>
              {post.title}
            </div>
            <div className="text-xs text-muted-foreground truncate" title={post.content}>
              {post.content.substring(0, 80)}...
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "platform",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Platform" />
      ),
      cell: ({ row }) => {
        const platform = getPlatformConfig(row.getValue("platform"))
        return (
          <Badge variant="outline" className={`${platform.color} text-white border-none`}>
            <platform.icon className="mr-1 h-3 w-3" />
            {platform.label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const statusConfig = {
          needs_review: { 
            label: "Review", 
            className: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" 
          },
          approved: { 
            label: "Approved", 
            className: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200" 
          },
          rejected: { 
            label: "Rejected", 
            className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200" 
          },
          scheduled: { 
            label: "Scheduled", 
            className: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200" 
          },
          published: { 
            label: "Published", 
            className: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200" 
          },
        }
        
        const config = statusConfig[status as keyof typeof statusConfig] || {
          label: status,
          className: "bg-gray-100 text-gray-800 border-gray-300"
        }
        
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date
        return (
          <div className="text-sm">
            <div>{format(date, "MMM d")}</div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(date, { addSuffix: true })}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "scheduledFor",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scheduled" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("scheduledFor") as Date | null
        if (!date) return <span className="text-muted-foreground">—</span>
        
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(date, "MMM d")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(date, "h:mm a")}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "characterCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Length" />
      ),
      cell: ({ row }) => {
        const post = row.original
        const platform = getPlatformConfig(post.platform)
        const percentage = ((post.content?.length || 0) / platform.charLimit) * 100
        const isNearLimit = percentage >= 80
        const isOverLimit = (post.content?.length || 0) > platform.charLimit
        
        return (
          <div className="min-w-[90px]">
            <CharacterCount
              count={post.content?.length || 0}
              limit={platform.charLimit}
              platform={post.platform}
              size="md"
              showProgress={false}
            />
            {isOverLimit && (
              <div className="text-[10px] text-red-600 font-medium mt-0.5">
                Over limit
              </div>
            )}
            {!isOverLimit && isNearLimit && (
              <div className="text-[10px] text-amber-600 mt-0.5">
                Near limit
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "insightTitle",
      header: "Source",
      cell: ({ row }) => {
        const post = row.original
        if (!post.insightId || !post.insightTitle) return <span className="text-muted-foreground">—</span>
        
        return (
          <div className="max-w-[200px]">
            <Link 
              href={`/insights?highlight=${post.insightId}`}
              className="text-sm text-blue-600 hover:underline truncate block"
              title={post.insightTitle}
            >
              {post.insightTitle}
            </Link>
            {post.transcriptTitle && (
              <Link
                href={`/transcripts`}
                className="text-xs text-muted-foreground hover:underline truncate block"
                title={post.transcriptTitle}
              >
                {post.transcriptTitle}
              </Link>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <PostActions 
          post={row.original} 
          onAction={onAction}
          loadingStates={loadingStates}
        />
      ),
    },
  ]
}