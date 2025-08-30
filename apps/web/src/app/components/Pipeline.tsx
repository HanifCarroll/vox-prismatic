'use client';

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats } from '@/types';
import { 
  FileText, 
  Zap, 
  Lightbulb,
  Edit3,
  Eye,
  CheckCircle, 
  Calendar, 
  Rocket,
  BarChart3, 
  Circle, 
  CircleAlert, 
  CircleDot 
} from 'lucide-react';

/**
 * Pipeline visualization component
 * Shows the content flow from transcripts to scheduled posts
 */

interface PipelineStage {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  status: 'needs-attention' | 'in-progress' | 'complete' | 'empty';
  href: string;
  description: string;
}

interface PipelineProps {
  stats: DashboardStats['workflowPipeline'] | DashboardStats['pipeline'];
  className?: string;
}

export function Pipeline({ stats, className = '' }: PipelineProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Handle undefined stats gracefully
  if (!stats) {
    return null;
  }

  // Check if we have workflow pipeline stats (new) or old pipeline stats
  const isWorkflowPipeline = 'rawInput' in stats;

  // Transform stats into workflow-based pipeline stages
  const stages: PipelineStage[] = isWorkflowPipeline ? [
    {
      id: 'raw-input',
      title: 'Raw Input',
      icon: FileText,
      count: stats.rawInput,
      status: stats.rawInput > 0 ? 'needs-attention' : 'empty',
      href: '/content?view=transcripts&status=raw',
      description: 'Transcripts needing cleaning'
    },
    {
      id: 'processing',
      title: 'Processing',
      icon: Zap,
      count: stats.processing,
      status: stats.processing > 0 ? 'in-progress' : 'empty',
      href: '/content?view=transcripts&status=processing',
      description: 'Items being processed'
    },
    {
      id: 'insights-review',
      title: 'Insights Review',
      icon: Lightbulb,
      count: stats.insightsReview,
      status: stats.insightsReview > 0 ? 'needs-attention' : 'empty',
      href: '/content?view=insights&status=needs_review',
      description: 'Insights needing review'
    },
    {
      id: 'posts-review',
      title: 'Posts Review',
      icon: Edit3,
      count: stats.postsReview,
      status: stats.postsReview > 0 ? 'needs-attention' : 'empty',
      href: '/content?view=posts&status=needs_review',
      description: 'Posts needing review'
    },
    {
      id: 'approved',
      title: 'Approved',
      icon: CheckCircle,
      count: stats.approved,
      status: stats.approved > 0 ? 'in-progress' : 'empty',
      href: '/content?view=posts&status=approved',
      description: 'Content ready to schedule'
    },
    {
      id: 'scheduled',
      title: 'Scheduled',
      icon: Calendar,
      count: stats.scheduled,
      status: stats.scheduled > 0 ? 'complete' : 'empty',
      href: '/scheduler',
      description: 'Posts queued for publication'
    },
    {
      id: 'published',
      title: 'Published',
      icon: Rocket,
      count: stats.published,
      status: stats.published > 0 ? 'complete' : 'empty',
      href: '/content?view=posts&status=published',
      description: 'Successfully published this week'
    }
  ] : [
    // Fallback to old pipeline format if workflow data not available
    {
      id: 'raw-transcripts',
      title: 'Raw Transcripts',
      icon: FileText,
      count: stats.rawTranscripts,
      status: stats.rawTranscripts > 0 ? 'needs-attention' : 'empty',
      href: '/content?view=transcripts&status=raw',
      description: 'Unprocessed transcript files ready for cleaning'
    },
    {
      id: 'cleaned-transcripts',
      title: 'Cleaned',
      icon: Zap,
      count: stats.cleanedTranscripts,
      status: stats.cleanedTranscripts > 0 ? 'complete' : 'empty',
      href: '/content?view=transcripts&status=cleaned',
      description: 'Clean transcripts ready for insight extraction'
    },
    {
      id: 'ready-insights',
      title: 'Insights',
      icon: Eye,
      count: stats.readyInsights,
      status: stats.readyInsights > 0 ? 'in-progress' : 'empty',
      href: '/content?view=insights&status=needs_review',
      description: 'AI-generated insights awaiting review'
    },
    {
      id: 'generated-posts',
      title: 'Needs Review',
      icon: Eye,
      count: stats.generatedPosts,
      status: stats.generatedPosts > 0 ? 'in-progress' : 'empty',
      href: '/content?view=posts&status=needs_review',
      description: 'Generated posts ready for review and editing'
    },
    {
      id: 'approved-posts',
      title: 'Ready to Schedule',
      icon: CheckCircle,
      count: stats.approvedPosts,
      status: stats.approvedPosts > 0 ? 'in-progress' : 'empty',
      href: '/content?view=posts&status=approved',
      description: 'Approved posts ready for scheduling'
    },
    {
      id: 'scheduled-posts',
      title: 'Scheduled',
      icon: Calendar,
      count: stats.scheduledPosts,
      status: stats.scheduledPosts > 0 ? 'complete' : 'empty',
      href: '/scheduler',
      description: 'Posts scheduled for publication'
    }
  ];

  const getStageStyles = (status: PipelineStage['status']) => {
    const baseStyles = 'transition-all duration-200 border-2 rounded-lg p-2 sm:p-3 cursor-pointer hover:scale-105 h-24 sm:h-28 flex flex-col justify-center';
    
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
    if (count === 0) return Circle;
    
    switch (status) {
      case 'needs-attention':
        return CircleAlert;
      case 'in-progress':
        return CircleDot;
      case 'complete':
        return CheckCircle;
      default:
        return Circle;
    }
  };

  return (
    <div className={`pipeline-visualization ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Content Pipeline Overview
        </h2>
        <p className="text-gray-600 text-sm">
          Click any stage to manage content at that level
        </p>
      </div>

      {/* Pipeline Flow */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
        {stages.map((stage, index) => (
          <div key={stage.id} className="relative">
            <Link href={stage.href}>
              <div
                className={getStageStyles(stage.status)}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <div className="text-center">
                  <stage.icon className="h-5 sm:h-6 w-5 sm:w-6 mx-auto mb-1 text-gray-700" />
                  <div className="font-medium text-gray-800 text-[10px] sm:text-xs mb-0.5 leading-tight">
                    {stage.title}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">
                    {stage.count}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 flex items-center justify-center gap-1">
                    {(() => {
                      const StatusIcon = getStatusIndicator(stage.status, stage.count);
                      return <StatusIcon className="h-3 w-3" />;
                    })()}
                    <span className="hidden sm:inline">
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
              <div className="hidden lg:block absolute -right-4 xl:-right-6 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg xl:text-xl">
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
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
          <div>
            <div className="text-xs sm:text-sm text-gray-600">Total Items</div>
            <div className="text-base sm:text-lg font-semibold text-gray-800">
              {stages.reduce((sum, stage) => sum + stage.count, 0)}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">Needs Action</div>
            <div className="text-base sm:text-lg font-semibold text-red-600">
              {isWorkflowPipeline 
                ? stats.rawInput + stats.insightsReview + stats.postsReview
                : stats.rawTranscripts + stats.readyInsights}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">In Progress</div>
            <div className="text-base sm:text-lg font-semibold text-yellow-600">
              {isWorkflowPipeline
                ? stats.processing + stats.approved
                : stats.generatedPosts + stats.approvedPosts}
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600">Completed</div>
            <div className="text-base sm:text-lg font-semibold text-green-600">
              {isWorkflowPipeline
                ? stats.scheduled + stats.published
                : stats.scheduledPosts}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}