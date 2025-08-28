import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Zap,
  Sparkles,
  Target,
  CheckCircle,
  XCircle,
  Package,
  Edit3,
  Eye,
  Calendar,
  Send,
  AlertCircle,
  Clock
} from 'lucide-react';

// Workflow stages for visual pipeline
export const WORKFLOW_STAGES = {
  transcript: {
    label: 'Transcript',
    icon: FileText,
    href: '/transcripts',
    color: 'text-purple-600'
  },
  insights: {
    label: 'Insights',
    icon: Sparkles,
    href: '/insights',
    color: 'text-blue-600'
  },
  posts: {
    label: 'Posts',
    icon: Edit3,
    href: '/posts',
    color: 'text-green-600'
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    href: '/scheduled',
    color: 'text-orange-600'
  }
} as const;

// Status progression mapping
export const STATUS_PROGRESSION = {
  // Transcript statuses
  raw: {
    next: 'cleaned',
    action: 'Clean',
    stage: 'transcript'
  },
  cleaned: {
    next: null, // Processing is now automatic - insights are created with needs_review
    action: null,
    stage: 'transcript'
  },
  
  // Unified statuses for insights and posts
  needs_review: {
    next: 'approved',
    action: 'Approve',
    stage: null // Used by both insights and posts
  },
  approved: {
    // Next action depends on content type - handled in component logic
    next: null, 
    action: null,
    stage: null
  },
  draft: {
    next: 'needs_review',
    action: 'Submit for Review',
    stage: 'posts'
  },
  scheduled: {
    next: 'published',
    action: null, // Automatic
    stage: 'scheduled'
  },
  published: {
    next: null,
    action: null,
    stage: 'scheduled'
  },
  
  // Terminal statuses
  rejected: {
    next: 'needs_review',
    action: 'Resubmit',
    stage: null
  },
  archived: {
    next: null,
    action: null,
    stage: null
  },
  error: {
    next: null,
    action: 'Retry',
    stage: null
  }
} as const;

// Icon mapping for statuses
export const STATUS_ICONS: Record<string, LucideIcon> = {
  raw: FileText,
  cleaned: Sparkles,
  needs_review: Eye,
  draft: Edit3,
  approved: CheckCircle,
  scheduled: Calendar,
  published: Send,
  rejected: XCircle,
  archived: Package,
  failed: AlertCircle
};

// Get the appropriate workflow stage for a given status
export function getWorkflowStage(status: string) {
  const progression = STATUS_PROGRESSION[status as keyof typeof STATUS_PROGRESSION];
  return progression?.stage ? WORKFLOW_STAGES[progression.stage as keyof typeof WORKFLOW_STAGES] : null;
}

// Get the next action for a given status
export function getNextAction(status: string) {
  const progression = STATUS_PROGRESSION[status as keyof typeof STATUS_PROGRESSION];
  return progression ? {
    status: progression.next,
    action: progression.action
  } : null;
}

// Check if a status is terminal (no further actions)
export function isTerminalStatus(status: string) {
  const progression = STATUS_PROGRESSION[status as keyof typeof STATUS_PROGRESSION];
  return !progression || progression.next === null;
}

// Get color theme for status
export function getStatusTheme(status: string) {
  const themes = {
    // Initial/Draft states - Gray
    raw: 'gray',
    draft: 'gray',
    
    // Processing/Review states - Yellow/Amber
    needs_review: 'amber',
    
    // Ready/Approved states - Green
    cleaned: 'blue',
    approved: 'green',
    
    // Scheduled/Active states - Blue
    scheduled: 'blue',
    published: 'emerald',
    
    // Error/Rejected states - Red
    rejected: 'red',
    failed: 'red',
    
    // Archived state - Gray
    archived: 'gray'
  };
  
  return themes[status as keyof typeof themes] || 'gray';
}