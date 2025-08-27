"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateDisplay } from "@/components/date";
import { ExpandableContent } from "@/components/ExpandableContent";
import Link from "next/link";
import type { InsightView } from "@/types";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Building2,
  CheckCircle,
  Edit3,
  Eye,
  FileText,
  MessageSquare,
  Package,
  Settings,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Edit3 },
  needs_review: {
    label: "Needs Review",
    color: "bg-yellow-100 text-yellow-800",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  archived: {
    label: "Archived",
    color: "bg-gray-100 text-gray-600",
    icon: Package,
  },
};

const postTypeConfig = {
  Problem: {
    icon: AlertTriangle,
    color: "bg-red-50 text-red-700 border-red-200",
  },
  Proof: { icon: BarChart3, color: "bg-blue-50 text-blue-700 border-blue-200" },
  Framework: {
    icon: Building2,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  "Contrarian Take": {
    icon: Target,
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  "Mental Model": {
    icon: Brain,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  Story: {
    icon: MessageSquare,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  Insight: {
    icon: TrendingUp,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  Tutorial: {
    icon: Settings,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

interface InsightCardProps {
  insight: InsightView;
  onAction: (action: string, insight: InsightView) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

function ScoreDisplay({ scores }: { scores: InsightView["scores"] }) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8) return "bg-green-100";
    if (score >= 6) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="flex items-center gap-3">
      {/* Total Score - Prominent */}
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${getScoreBackground(
          scores.total
        )} ${getScoreColor(scores.total)}`}
      >
        {scores.total}
      </div>

      {/* Individual Scores */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">U:</span>
          <span className={`font-medium ${getScoreColor(scores.urgency)}`}>
            {scores.urgency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">R:</span>
          <span className={`font-medium ${getScoreColor(scores.relatability)}`}>
            {scores.relatability}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">S:</span>
          <span className={`font-medium ${getScoreColor(scores.specificity)}`}>
            {scores.specificity}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">A:</span>
          <span className={`font-medium ${getScoreColor(scores.authority)}`}>
            {scores.authority}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function InsightCard({
  insight,
  onAction,
  isSelected,
  onSelect,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[insight.status];
  const postType = postTypeConfig[insight.postType] || {
    icon: FileText,
    color: "bg-gray-50 text-gray-700 border-gray-200",
  };

  const getActionButton = () => {
    switch (insight.status) {
      case "needs_review":
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => onAction("approve", insight)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
            <Button
              onClick={() => onAction("reject", insight)}
              size="sm"
              variant="destructive"
            >
              Reject
            </Button>
          </div>
        );
      case "approved":
        return (
          <Button onClick={() => onAction("generate_posts", insight)} size="sm">
            Generate Posts
          </Button>
        );
      case "rejected":
      case "archived":
        return (
          <Button
            onClick={() => onAction("review", insight)}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Review Again
          </Button>
        );
      default:
        return (
          <Button
            onClick={() => onAction("edit", insight)}
            size="sm"
            variant="secondary"
          >
            Edit
          </Button>
        );
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        isSelected ? "border-blue-500 bg-blue-50" : "hover:shadow-md"
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          {onSelect && (
            <div className="flex-shrink-0 pt-1">
              <Checkbox
                checked={isSelected || false}
                onCheckedChange={(checked) => onSelect(insight.id, !!checked)}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {insight.title}
                  </h3>
                  <Badge
                    variant={
                      insight.status === "approved"
                        ? "default"
                        : insight.status === "needs_review"
                        ? "secondary"
                        : insight.status === "rejected"
                        ? "destructive"
                        : "outline"
                    }
                    className="gap-1"
                  >
                    <status.icon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  {insight.postType && (
                    <Badge variant="outline" className="gap-1">
                      <postType.icon className="h-3 w-3" />
                      {insight.postType}
                    </Badge>
                  )}
                  {insight.category && (
                    <Badge variant="secondary">{insight.category}</Badge>
                  )}
                  <DateDisplay date={insight.createdAt} />
                  {insight.cleanedTranscriptId && insight.transcriptTitle && (
                    <Link
                      href={`/transcripts?highlight=${insight.cleanedTranscriptId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-32"
                    >
                      from "{insight.transcriptTitle}"
                    </Link>
                  )}
                  {!insight.cleanedTranscriptId && insight.transcriptTitle && (
                    <span className="text-blue-600 truncate max-w-32">
                      from "{insight.transcriptTitle}"
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Summary with Expandable Content */}
            <div className="text-gray-700 text-sm mb-4">
              <ExpandableContent
                content={insight.summary}
                maxLength={150}
                maxLines={2}
                expandText="Show full insight"
                collapseText="Show less"
              />
            </div>

            {/* Score and Actions Row */}
            <div className="flex items-center justify-between">
              <ScoreDisplay scores={insight.scores} />

              <div className="flex items-center gap-2">
                {getActionButton()}
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  variant="ghost"
                  size="sm"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 gap-4">
              {/* Verbatim Quote */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Verbatim Quote
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-200">
                  <p className="text-gray-700 text-sm italic">
                    "{insight.verbatimQuote}"
                  </p>
                </div>
              </div>

              {/* Full Summary */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Full Summary
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {insight.summary}
                </p>
              </div>

              {/* Score Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Score Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-red-600">
                      {insight.scores.urgency}
                    </div>
                    <div className="text-xs text-gray-600">Urgency</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-green-600">
                      {insight.scores.relatability}
                    </div>
                    <div className="text-xs text-gray-600">Relatability</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-blue-600">
                      {insight.scores.specificity}
                    </div>
                    <div className="text-xs text-gray-600">Specificity</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-purple-600">
                      {insight.scores.authority}
                    </div>
                    <div className="text-xs text-gray-600">Authority</div>
                  </div>
                </div>
              </div>

              {/* Processing Metadata */}
              {(insight.processingDurationMs || insight.estimatedTokens) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    Processing Info
                  </h4>
                  <div className="flex gap-4 text-sm text-gray-600">
                    {insight.processingDurationMs && (
                      <span>
                        Processing:{" "}
                        {Math.round(insight.processingDurationMs / 1000)}s
                      </span>
                    )}
                    {insight.estimatedTokens && (
                      <span>
                        Tokens: ~{insight.estimatedTokens.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
