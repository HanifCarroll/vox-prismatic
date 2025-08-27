"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  FileText,
  Mic,
  Folder,
  PencilLine,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  Target,
  CheckCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { TranscriptView } from "@/types/database";
import { TimeAgoDisplay } from "@/components/date";

interface TranscriptActionsProps {
  transcript: TranscriptView;
  onAction: (action: string, transcript: TranscriptView) => void;
  loadingStates?: Record<string, boolean>;
}

function TranscriptActions({ transcript, onAction, loadingStates = {} }: TranscriptActionsProps) {
  const isActionLoading = (action: string) =>
    loadingStates[`${action}-${transcript.id}`] || false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAction("view", transcript)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("edit", transcript)}>
          <Edit3 className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        
        {transcript.status === "raw" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("clean", transcript)}
              disabled={isActionLoading("clean")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Clean Transcript
            </DropdownMenuItem>
          </>
        )}
        
        {transcript.status === "cleaned" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("process", transcript)}
              disabled={isActionLoading("process")}
            >
              <Target className="mr-2 h-4 w-4" />
              Extract Insights
            </DropdownMenuItem>
          </>
        )}
        
        {transcript.status === "insights_generated" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("generate_posts", transcript)}
              disabled={isActionLoading("generate_posts")}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Generate Posts
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAction("delete", transcript)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getSourceIcon(sourceType: string) {
  switch (sourceType) {
    case "recording":
      return Mic;
    case "upload":
      return Folder;
    case "manual":
      return PencilLine;
    default:
      return FileText;
  }
}

export function getColumns(
  onAction: (action: string, transcript: TranscriptView) => void,
  loadingStates: Record<string, boolean> = {}
): ColumnDef<TranscriptView>[] {
  return [
    {
      id: "select",
      size: 50,
      minSize: 50,
      maxSize: 50,
      enableResizing: false,
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
      size: 350,
      minSize: 200,
      maxSize: 500,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => {
        const transcript = row.original;
        const content = transcript.cleanedContent || transcript.rawContent;
        const preview = content.substring(0, 100).replace(/\n/g, ' ');
        
        return (
          <div className="max-w-[350px]">
            <div
              className="font-medium truncate"
              title={transcript.title}
            >
              {transcript.title}
            </div>
            <div
              className="text-xs text-muted-foreground truncate"
              title={preview}
            >
              {preview}...
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "sourceType",
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => {
        const sourceType = row.getValue("sourceType") as string;
        const Icon = getSourceIcon(sourceType);
        
        return (
          <Badge variant="outline" className="gap-1">
            <Icon className="h-3 w-3" />
            {sourceType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "wordCount",
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Words" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("wordCount") as number;
        const duration = row.original.duration;
        
        return (
          <div className="text-sm">
            <div>{count.toLocaleString()}</div>
            {duration && (
              <div className="text-xs text-muted-foreground">
                {Math.floor(duration / 60)}m {duration % 60}s
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      size: 140,
      minSize: 120,
      maxSize: 180,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        
        const statusConfig = {
          raw: {
            label: "Needs Cleaning",
            icon: FileText,
            className: "bg-yellow-100 text-yellow-800 border-yellow-300",
          },
          cleaned: {
            label: "Cleaned",
            icon: Sparkles,
            className: "bg-blue-100 text-blue-800 border-blue-300",
          },
          processing: {
            label: "Processing",
            icon: Clock,
            className: "bg-amber-100 text-amber-800 border-amber-300",
          },
          insights_generated: {
            label: "Insights Ready",
            icon: Target,
            className: "bg-green-100 text-green-800 border-green-300",
          },
          posts_created: {
            label: "Posts Created",
            icon: CheckCircle,
            className: "bg-purple-100 text-purple-800 border-purple-300",
          },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || {
          label: status,
          icon: FileText,
          className: "bg-gray-100 text-gray-800 border-gray-300",
        };
        
        return (
          <Badge variant="outline" className={`${config.className} gap-1`}>
            <config.icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      size: 120,
      minSize: 100,
      maxSize: 200,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return (
          <div className="text-sm">
            {format(date, "MMM d, yyyy")}
          </div>
        );
      },
    },
    {
      id: "insights",
      header: "Related",
      size: 120,
      minSize: 100,
      maxSize: 150,
      cell: ({ row }) => {
        const transcript = row.original;
        // These counts would come from the actual data
        const insightCount = 0; // transcript.insightCount || 0
        const postCount = 0; // transcript.postCount || 0
        
        return (
          <div className="flex gap-2">
            {insightCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {insightCount} insights
              </Badge>
            )}
            {postCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {postCount} posts
              </Badge>
            )}
            {insightCount === 0 && postCount === 0 && (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      size: 60,
      minSize: 60,
      maxSize: 60,
      enableResizing: false,
      enableHiding: false,
      cell: ({ row }) => (
        <TranscriptActions
          transcript={row.original}
          onAction={onAction}
          loadingStates={loadingStates}
        />
      ),
    },
  ];
}