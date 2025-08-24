'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardStats } from '../api/dashboard/stats/route';

/**
 * Pipeline visualization component
 * Shows the content flow from transcripts to scheduled posts
 */

interface PipelineStage {
  id: string;
  title: string;
  icon: string;
  count: number;
  status: 'needs-attention' | 'in-progress' | 'complete' | 'empty';
  href: string;
  description: string;
}

interface PipelineProps {
  stats: DashboardStats['pipeline'];
  className?: string;
}

export function Pipeline({ stats, className = '' }: PipelineProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Transform stats into pipeline stages
  const stages: PipelineStage[] = [
    {
      id: 'raw-transcripts',
      title: 'Raw Transcripts',
      icon: '📄',
      count: stats.rawTranscripts,
      status: stats.rawTranscripts > 0 ? 'needs-attention' : 'empty',
      href: '/transcripts?filter=raw',
      description: 'Unprocessed transcript files ready for cleaning'
    },
    {
      id: 'cleaned-transcripts',
      title: 'Cleaned',
      icon: '🧹',
      count: stats.cleanedTranscripts,
      status: stats.cleanedTranscripts > 0 ? 'complete' : 'empty',
      href: '/transcripts?filter=cleaned',
      description: 'Clean transcripts ready for insight extraction'
    },
    {
      id: 'ready-insights',
      title: 'Insights',
      icon: '💡',
      count: stats.readyInsights,
      status: stats.readyInsights > 0 ? 'in-progress' : 'empty',
      href: '/insights?filter=review',
      description: 'AI-generated insights awaiting review'
    },
    {
      id: 'generated-posts',
      title: 'Needs Review',
      icon: '📝',
      count: stats.generatedPosts,
      status: stats.generatedPosts > 0 ? 'in-progress' : 'empty',
      href: '/posts?filter=draft',
      description: 'Generated posts ready for review and editing'
    },
    {
      id: 'approved-posts',
      title: 'Ready to Schedule',
      icon: '✅',
      count: stats.approvedPosts,
      status: stats.approvedPosts > 0 ? 'in-progress' : 'empty',
      href: '/posts?filter=approved',
      description: 'Approved posts ready for scheduling'
    },
    {
      id: 'scheduled-posts',
      title: 'Scheduled',
      icon: '📅',
      count: stats.scheduledPosts,
      status: stats.scheduledPosts > 0 ? 'complete' : 'empty',
      href: '/scheduler',
      description: 'Posts scheduled for publication'
    }
  ];

  const getStageStyles = (status: PipelineStage['status']) => {
    const baseStyles = 'transition-all duration-200 border-2 rounded-lg p-4 cursor-pointer hover:scale-105 h-32 flex flex-col justify-center';
    
    switch (status) {
      case 'needs-attention':
        return `${baseStyles} bg-red-50 border-red-200 hover:border-red-300 hover:bg-red-100`;
      case 'in-progress':
        return `${baseStyles} bg-yellow-50 border-yellow-200 hover:border-yellow-300 hover:bg-yellow-100`;
      case 'complete':
        return `${baseStyles} bg-green-50 border-green-200 hover:border-green-300 hover:bg-green-100`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100`;
    }
  };

  const getStatusIndicator = (status: PipelineStage['status'], count: number) => {
    if (count === 0) return '⚪';
    
    switch (status) {
      case 'needs-attention':
        return '🔴';
      case 'in-progress':
        return '🟡';
      case 'complete':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className={`pipeline-visualization ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
          📊 Content Pipeline Overview
        </h2>
        <p className="text-gray-600 text-sm">
          Click any stage to manage content at that level
        </p>
      </div>

      {/* Pipeline Flow */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stages.map((stage, index) => (
          <div key={stage.id} className="relative">
            <Link href={stage.href}>
              <div
                className={getStageStyles(stage.status)}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{stage.icon}</div>
                  <div className="font-medium text-gray-800 text-sm mb-1">
                    {stage.title}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stage.count}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    {getStatusIndicator(stage.status, stage.count)}
                    <span>
                      {stage.status === 'needs-attention' && 'Action needed'}
                      {stage.status === 'in-progress' && 'In progress'}
                      {stage.status === 'complete' && 'Complete'}
                      {stage.status === 'empty' && 'Empty'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Arrow to next stage */}
            {index < stages.length - 1 && (
              <div className="hidden lg:block absolute -right-6 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">
                →
              </div>
            )}

            {/* Hover tooltip */}
            {hoveredStage === stage.id && (
              <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                {stage.description}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Total Items</div>
            <div className="text-lg font-semibold text-gray-800">
              {Object.values(stats).reduce((sum, count) => sum + count, 0)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Needs Action</div>
            <div className="text-lg font-semibold text-red-600">
              {stats.rawTranscripts + stats.readyInsights}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">In Progress</div>
            <div className="text-lg font-semibold text-yellow-600">
              {stats.generatedPosts + stats.approvedPosts}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-lg font-semibold text-green-600">
              {stats.scheduledPosts}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}