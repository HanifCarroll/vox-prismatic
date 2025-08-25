'use client';

import { useState } from 'react';

export interface InsightView {
  id: string;
  cleanedTranscriptId: string;
  title: string;
  summary: string;
  verbatimQuote: string;
  category: string;
  postType: 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  status: 'draft' | 'needs_review' | 'approved' | 'rejected' | 'archived';
  processingDurationMs?: number;
  estimatedTokens?: number;
  createdAt: Date;
  updatedAt: Date;
  transcriptTitle?: string;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: '📝' },
  needs_review: { label: 'Needs Review', color: 'bg-yellow-100 text-yellow-800', icon: '👀' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: '✅' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: '❌' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-600', icon: '📦' }
};

const postTypeConfig = {
  'Problem': { icon: '⚠️', color: 'bg-red-50 text-red-700 border-red-200' },
  'Proof': { icon: '📊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Framework': { icon: '🏗️', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Contrarian Take': { icon: '🎯', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Mental Model': { icon: '🧠', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
};

interface InsightCardProps {
  insight: InsightView;
  onAction: (action: string, insight: InsightView) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

function ScoreDisplay({ scores }: { scores: InsightView['scores'] }) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Total Score - Prominent */}
      <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${getScoreBackground(scores.total)} ${getScoreColor(scores.total)}`}>
        {scores.total}
      </div>
      
      {/* Individual Scores */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">U:</span>
          <span className={`font-medium ${getScoreColor(scores.urgency)}`}>{scores.urgency}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">R:</span>
          <span className={`font-medium ${getScoreColor(scores.relatability)}`}>{scores.relatability}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">S:</span>
          <span className={`font-medium ${getScoreColor(scores.specificity)}`}>{scores.specificity}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">A:</span>
          <span className={`font-medium ${getScoreColor(scores.authority)}`}>{scores.authority}</span>
        </div>
      </div>
    </div>
  );
}

export default function InsightCard({ insight, onAction, isSelected, onSelect }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[insight.status];
  const postType = postTypeConfig[insight.postType];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const getActionButton = () => {
    switch (insight.status) {
      case 'needs_review':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onAction('approve', insight)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onAction('reject', insight)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        );
      case 'approved':
        return (
          <button
            onClick={() => onAction('generate_posts', insight)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Generate Posts
          </button>
        );
      case 'rejected':
      case 'archived':
        return (
          <button
            onClick={() => onAction('review', insight)}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
          >
            Review Again
          </button>
        );
      default:
        return (
          <button
            onClick={() => onAction('edit', insight)}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Edit
          </button>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:shadow-md hover:border-gray-300'}`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          {onSelect && (
            <div className="flex-shrink-0 pt-1">
              <input
                type="checkbox"
                checked={isSelected || false}
                onChange={(e) => onSelect(insight.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    <span className="mr-1">{status.icon}</span>
                    {status.label}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <span className={`inline-flex items-center px-2 py-1 border rounded-md text-xs font-medium ${postType.color}`}>
                    <span className="mr-1">{postType.icon}</span>
                    {insight.postType}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                    {insight.category}
                  </span>
                  <span>{formatDate(insight.createdAt)}</span>
                  {insight.transcriptTitle && (
                    <span className="text-blue-600 hover:text-blue-800 cursor-pointer truncate max-w-32">
                      from "{insight.transcriptTitle}"
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <p className="text-gray-700 text-sm mb-4 line-clamp-2">
              {insight.summary}
            </p>

            {/* Score and Actions Row */}
            <div className="flex items-center justify-between">
              <ScoreDisplay scores={insight.scores} />
              
              <div className="flex items-center gap-2">
                {getActionButton()}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
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
                  <span>💬</span> Verbatim Quote
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
                  <span>📝</span> Full Summary
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {insight.summary}
                </p>
              </div>

              {/* Score Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <span>📊</span> Score Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-red-600">{insight.scores.urgency}</div>
                    <div className="text-xs text-gray-600">Urgency</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-green-600">{insight.scores.relatability}</div>
                    <div className="text-xs text-gray-600">Relatability</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{insight.scores.specificity}</div>
                    <div className="text-xs text-gray-600">Specificity</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-purple-600">{insight.scores.authority}</div>
                    <div className="text-xs text-gray-600">Authority</div>
                  </div>
                </div>
              </div>

              {/* Processing Metadata */}
              {(insight.processingDurationMs || insight.estimatedTokens) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <span>⚙️</span> Processing Info
                  </h4>
                  <div className="flex gap-4 text-sm text-gray-600">
                    {insight.processingDurationMs && (
                      <span>Processing: {Math.round(insight.processingDurationMs / 1000)}s</span>
                    )}
                    {insight.estimatedTokens && (
                      <span>Tokens: ~{insight.estimatedTokens.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}