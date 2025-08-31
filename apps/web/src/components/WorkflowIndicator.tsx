import { ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  label: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  href?: string;
}

interface WorkflowIndicatorProps {
  steps: WorkflowStep[];
  className?: string;
  size?: 'sm' | 'md';
}

export function WorkflowIndicator({ steps, className = '', size = 'md' }: WorkflowIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'current':
        return <Clock className="h-3 w-3 text-blue-600 animate-pulse" />;
      case 'pending':
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
      case 'skipped':
        return null;
    }
  };

  const getStepClasses = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 font-medium';
      case 'current':
        return 'text-blue-600 font-semibold';
      case 'pending':
        return 'text-gray-400';
      case 'skipped':
        return 'text-gray-300 line-through';
    }
  };

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', sizeClasses[size], className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-1">
          <div className={cn('flex items-center gap-1', getStepClasses(step.status))}>
            {getStepIcon(step.status)}
            {step.href ? (
              <Link to={step.href} className="hover:underline">
                {step.label}
              </Link>
            ) : (
              <span>{step.label}</span>
            )}
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-3 w-3 text-gray-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// Helper to generate workflow steps for content items
export function getContentWorkflowSteps(
  type: 'transcript' | 'insight' | 'post',
  status: string,
  ids?: { transcriptId?: string; insightId?: string; postId?: string }
): WorkflowStep[] {
  const steps: WorkflowStep[] = [];

  // Transcript step
  steps.push({
    label: 'Transcript',
    status: type === 'transcript' ? 'current' : ids?.transcriptId ? 'completed' : 'pending',
    href: ids?.transcriptId ? `/transcripts?highlight=${ids.transcriptId}` : undefined
  });

  // Insight step
  steps.push({
    label: 'Insight',
    status: type === 'insight' ? 'current' : ids?.insightId ? 'completed' : 'pending',
    href: ids?.insightId ? `/insights?highlight=${ids.insightId}` : undefined
  });

  // Post step
  steps.push({
    label: 'Post',
    status: type === 'post' ? 'current' : ids?.postId ? 'completed' : 'pending',
    href: ids?.postId ? `/posts?highlight=${ids.postId}` : undefined
  });

  // Schedule step
  steps.push({
    label: 'Scheduled',
    status: status === 'scheduled' ? 'completed' : status === 'approved' ? 'pending' : 'skipped',
    href: status === 'scheduled' ? '/scheduler' : undefined
  });

  return steps;
}