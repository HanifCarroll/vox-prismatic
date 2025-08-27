"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Edit3,
  Check,
  X,
  AlertTriangle,
  BarChart3,
  Brain,
  Building2,
  MessageSquare,
  Target,
  TrendingUp,
  Settings,
  Lightbulb,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

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
import type { InsightView } from "@/types";
import { TimeAgoDisplay } from "@/components/date";

interface InsightActionsProps {
  insight: InsightView;
  onAction: (action: string, insight: InsightView) => void;
  loadingStates?: Record<string, boolean>;
}

function InsightActions({ insight, onAction, loadingStates = {} }: InsightActionsProps) {
  const isActionLoading = (action: string) =>
    loadingStates[`${action}-${insight.id}`] || false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAction("view", insight)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("edit", insight)}>
          <Edit3 className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        
        {insight.status === "needs_review" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("approve", insight)}
              disabled={isActionLoading("approve")}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction("reject", insight)}
              disabled={isActionLoading("reject")}
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        
        {insight.status === "approved" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("generate_posts", insight)}
              disabled={isActionLoading("generate_posts")}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Generate Posts
            </DropdownMenuItem>
          </>
        )}
        
        {(insight.status === "rejected" || insight.status === "archived") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("review", insight)}
              disabled={isActionLoading("review")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Review Again
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const postTypeIcons = {
  Problem: AlertTriangle,
  Proof: BarChart3,
  Framework: Building2,
  "Contrarian Take": Target,
  "Mental Model": Brain,
  Story: MessageSquare,
  Insight: TrendingUp,
  Tutorial: Settings,
};

function ScoreCell({ scores }: { scores: InsightView["scores"] }) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50";
    if (score >= 6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getScoreColor(scores.total)}`}
        title={`Urgency: ${scores.urgency}, Relatability: ${scores.relatability}, Specificity: ${scores.specificity}, Authority: ${scores.authority}`}
      >
        {scores.total}
      </div>
      <div className="hidden xl:flex flex-col text-[10px] leading-tight">
        <span className="text-muted-foreground">U:{scores.urgency} R:{scores.relatability}</span>
        <span className="text-muted-foreground">S:{scores.specificity} A:{scores.authority}</span>
      </div>
    </div>
  );
}

export function getColumns(
  onAction: (action: string, insight: InsightView) => void,
  loadingStates: Record<string, boolean> = {}
): ColumnDef<InsightView>[] {
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
        const insight = row.original;
        const summary = insight.summary.substring(0, 100);
        
        return (
          <div className="max-w-[350px]">
            <div
              className="font-medium truncate"
              title={insight.title}
            >
              {insight.title}
            </div>
            <div
              className="text-xs text-muted-foreground truncate"
              title={insight.summary}
            >
              {summary}...
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "postType",
      size: 130,
      minSize: 100,
      maxSize: 180,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const postType = row.getValue("postType") as string;
        const Icon = postTypeIcons[postType as keyof typeof postTypeIcons] || Lightbulb;
        
        return (
          <Badge variant="outline" className="gap-1">
            <Icon className="h-3 w-3" />
            {postType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "category",
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return (
          <Badge variant="secondary">
            {category}
          </Badge>
        );
      },
    },
    {
      accessorKey: "scores",
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Score" />
      ),
      cell: ({ row }) => {
        const insight = row.original;
        return <ScoreCell scores={insight.scores} />;
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.original.scores.total;
        const b = rowB.original.scores.total;
        return a > b ? 1 : a < b ? -1 : 0;
      },
    },
    {
      accessorKey: "status",
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusConfig = {
          draft: {
            label: "Draft",
            className: "bg-gray-100 text-gray-800 border-gray-300",
          },
          needs_review: {
            label: "Review",
            className: "bg-amber-100 text-amber-800 border-amber-300",
          },
          approved: {
            label: "Approved",
            className: "bg-green-100 text-green-800 border-green-300",
          },
          rejected: {
            label: "Rejected",
            className: "bg-red-100 text-red-800 border-red-300",
          },
          archived: {
            label: "Archived",
            className: "bg-gray-100 text-gray-600 border-gray-300",
          },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || {
          label: status,
          className: "bg-gray-100 text-gray-800 border-gray-300",
        };
        
        return (
          <Badge variant="outline" className={config.className}>
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
            {format(date, "MMM d")}
          </div>
        );
      },
    },
    {
      accessorKey: "transcriptTitle",
      header: "Source",
      size: 180,
      minSize: 120,
      maxSize: 250,
      enableResizing: true,
      cell: ({ row }) => {
        const insight = row.original;
        
        if (!insight.cleanedTranscriptId || !insight.transcriptTitle) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        return (
          <Link
            href={`/transcripts?highlight=${insight.cleanedTranscriptId}`}
            className="text-sm text-blue-600 hover:underline truncate block max-w-[180px]"
            title={insight.transcriptTitle}
          >
            {insight.transcriptTitle}
          </Link>
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
        <InsightActions
          insight={row.original}
          onAction={onAction}
          loadingStates={loadingStates}
        />
      ),
    },
  ];
}