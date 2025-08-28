'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { WORKFLOW_STAGES } from '@/constants/statuses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight, ArrowRight, CheckCircle2 } from 'lucide-react';

interface WorkflowNavigationProps {
  counts?: {
    transcripts?: number;
    insights?: number;
    posts?: number;
    scheduled?: number;
  };
  currentItem?: {
    type: 'transcript' | 'insight' | 'post';
    id: string;
    relatedCounts?: {
      insights?: number;
      posts?: number;
    };
  };
  className?: string;
}

export function WorkflowNavigation({ counts = {}, currentItem, className }: WorkflowNavigationProps) {
  const pathname = usePathname();
  
  // Determine current stage based on pathname
  const getCurrentStage = () => {
    if (pathname.includes('/transcripts')) return 'transcript';
    if (pathname.includes('/insights')) return 'insights';
    if (pathname.includes('/posts')) return 'posts';
    if (pathname.includes('/scheduled')) return 'scheduled';
    return null;
  };
  
  const currentStage = getCurrentStage();
  
  const stages = [
    { 
      key: 'transcript', 
      ...WORKFLOW_STAGES.transcript,
      count: counts.transcripts 
    },
    { 
      key: 'insights', 
      ...WORKFLOW_STAGES.insights,
      count: counts.insights 
    },
    { 
      key: 'posts', 
      ...WORKFLOW_STAGES.posts,
      count: counts.posts 
    },
    { 
      key: 'scheduled', 
      ...WORKFLOW_STAGES.scheduled,
      count: counts.scheduled 
    }
  ];
  
  // Get progress percentage based on stage
  const getProgress = (stageKey: string) => {
    const stageOrder = ['transcript', 'insights', 'posts', 'scheduled'];
    const currentIndex = stageOrder.indexOf(currentStage || '');
    const stageIndex = stageOrder.indexOf(stageKey);
    
    if (currentIndex === -1) return false;
    return stageIndex <= currentIndex;
  };
  
  return (
    <div className={cn("bg-white border-b", className)}>
      <div className="container mx-auto px-4 py-4">
        {/* Pipeline Progress */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-600">Content Pipeline</h2>
          {currentItem && (
            <span className="text-xs text-gray-500">
              Working on: {currentItem.type}
            </span>
          )}
        </div>
        
        {/* Workflow Stages */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = currentStage === stage.key;
            const isCompleted = getProgress(stage.key) && !isActive;
            
            return (
              <div key={stage.key} className="flex items-center">
                <Link href={stage.href}>
                  <Button
                    variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "group transition-all",
                      isActive && "ring-2 ring-offset-2 ring-blue-500",
                      !isActive && !isCompleted && "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{stage.label}</span>
                      <span className="sm:hidden">{stage.label.slice(0, 3)}</span>
                      {stage.count !== undefined && stage.count > 0 && (
                        <Badge 
                          variant={isActive ? "secondary" : "outline"}
                          className="ml-1 text-xs px-1.5 py-0"
                        >
                          {stage.count}
                        </Badge>
                      )}
                    </div>
                  </Button>
                </Link>
                
                {index < stages.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Current Item Related Links */}
        {currentItem && currentItem.relatedCounts && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t">
            <span className="text-xs text-gray-500">Related content:</span>
            <div className="flex items-center gap-3">
              {currentItem.relatedCounts.insights !== undefined && (
                <Link 
                  href={`/insights?${currentItem.type}Id=${currentItem.id}`}
                  className="group flex items-center gap-1.5 text-xs"
                >
                  <span className="text-blue-600 group-hover:text-blue-700">
                    {currentItem.relatedCounts.insights} insights
                  </span>
                  <ArrowRight className="h-3 w-3 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
              {currentItem.relatedCounts.posts !== undefined && (
                <Link 
                  href={`/posts?${currentItem.type}Id=${currentItem.id}`}
                  className="group flex items-center gap-1.5 text-xs"
                >
                  <span className="text-green-600 group-hover:text-green-700">
                    {currentItem.relatedCounts.posts} posts
                  </span>
                  <ArrowRight className="h-3 w-3 text-green-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Workflow Progress Bar Component
export function WorkflowProgress({ 
  currentStatus, 
  itemType 
}: { 
  currentStatus: string; 
  itemType: 'transcript' | 'insight' | 'post' 
}) {
  // Define workflow steps for each item type
  const getWorkflowSteps = () => {
    switch (itemType) {
      case 'transcript':
        return [
          { status: 'raw', label: 'Raw' },
          { status: 'cleaned', label: 'Cleaned' }
          // Insights are now auto-generated with needs_review status
        ];
      case 'insight':
        return [
          { status: 'needs_review', label: 'Review' },
          { status: 'approved', label: 'Approved' }
          // Posts are now auto-generated when insight is approved
        ];
      case 'post':
        return [
          { status: 'needs_review', label: 'Review' },
          { status: 'approved', label: 'Approved' },
          { status: 'scheduled', label: 'Scheduled' },
          { status: 'published', label: 'Published' }
        ];
      default:
        return [];
    }
  };
  
  const steps = getWorkflowSteps();
  const currentIndex = steps.findIndex(s => s.status === currentStatus);
  const progress = currentIndex === -1 ? 0 : ((currentIndex + 1) / steps.length) * 100;
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div 
              key={step.status}
              className={cn(
                "text-xs font-medium",
                isCompleted ? "text-blue-600" : "text-gray-400",
                isCurrent && "text-blue-700 font-semibold"
              )}
            >
              {step.label}
            </div>
          );
        })}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Quick Action Buttons for workflow progression
export function WorkflowActions({ 
  currentStatus,
  itemType,
  onAction
}: {
  currentStatus: string;
  itemType: 'transcript' | 'insight' | 'post';
  onAction: (action: string) => void;
}) {
  // Get available actions based on current status
  const getActions = () => {
    const actions = [];
    
    if (itemType === 'transcript') {
      if (currentStatus === 'raw') {
        actions.push({ 
          action: 'clean', 
          label: 'Clean Transcript', 
          icon: '✨',
          className: 'bg-blue-600 hover:bg-blue-700'
        });
      } else if (currentStatus === 'cleaned') {
        actions.push({ 
          action: 'process', 
          label: 'Extract Insights', 
          icon: '🎯',
          className: 'bg-green-600 hover:bg-green-700'
        });
      }
    } else if (itemType === 'insight') {
      if (currentStatus === 'needs_review') {
        actions.push({ 
          action: 'approve', 
          label: 'Approve', 
          icon: '✅',
          className: 'bg-green-600 hover:bg-green-700'
        });
      }
      // Posts are now auto-generated when insight is approved
    } else if (itemType === 'post') {
      if (currentStatus === 'needs_review') {
        actions.push({ 
          action: 'approve', 
          label: 'Approve', 
          icon: '✅',
          className: 'bg-green-600 hover:bg-green-700'
        });
      } else if (currentStatus === 'approved') {
        actions.push({ 
          action: 'schedule', 
          label: 'Schedule', 
          icon: '📅',
          className: 'bg-blue-600 hover:bg-blue-700'
        });
      }
    }
    
    return actions;
  };
  
  const actions = getActions();
  
  if (actions.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Next step:</span>
      {actions.map(action => (
        <Button
          key={action.action}
          size="sm"
          onClick={() => onAction(action.action)}
          className={cn("text-xs", action.className)}
        >
          <span className="mr-1">{action.icon}</span>
          {action.label}
        </Button>
      ))}
    </div>
  );
}