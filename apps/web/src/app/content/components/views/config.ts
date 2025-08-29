import { FileText, Lightbulb, Edit3, Sparkles, CheckCircle, XCircle, Trash2, Calendar, Send } from "lucide-react";
import type { TranscriptView, InsightView, PostView } from "@/types/database";

export type ContentView = 'transcripts' | 'insights' | 'posts';
export type ContentItem = TranscriptView | InsightView | PostView;

export interface ColumnConfig<T = ContentItem> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'range' | 'search';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
}

export interface ActionConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  condition?: (item: ContentItem) => boolean;
  requireConfirm?: boolean;
  confirmMessage?: string;
}

export interface ViewConfig<T = ContentItem> {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyMessage: string;
  columns: ColumnConfig<T>[];
  filters: FilterConfig[];
  actions: ActionConfig[];
  bulkActions: ActionConfig[];
  defaultSort: {
    field: string;
    order: 'asc' | 'desc';
  };
  statusField: string;
  searchableFields: string[];
}

// Status configurations
export const STATUS_STYLES = {
  // Transcript statuses
  raw: 'bg-gray-100 text-gray-700',
  cleaned: 'bg-blue-100 text-blue-700',
  processed: 'bg-green-100 text-green-700',
  
  // Insight statuses
  needs_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  
  // Post statuses
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
};

// Category styles
export const CATEGORY_STYLES = {
  business: 'bg-blue-100 text-blue-700',
  marketing: 'bg-purple-100 text-purple-700',
  personal: 'bg-pink-100 text-pink-700',
  technology: 'bg-indigo-100 text-indigo-700',
  health: 'bg-green-100 text-green-700',
  finance: 'bg-yellow-100 text-yellow-700',
  education: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
};

// Platform styles
export const PLATFORM_STYLES = {
  linkedin: 'bg-blue-600 text-white',
  twitter: 'bg-black text-white',
  facebook: 'bg-blue-500 text-white',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
};

// View Configurations
export const VIEW_CONFIGS: Record<ContentView, ViewConfig> = {
  transcripts: {
    name: 'Transcripts',
    icon: FileText,
    emptyIcon: FileText,
    emptyTitle: 'No transcripts found',
    emptyMessage: 'Create your first transcript to get started',
    columns: [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 'w-32',
      },
      {
        key: 'wordCount',
        label: 'Word Count',
        sortable: true,
        width: 'w-32',
      },
      {
        key: 'insights',
        label: 'Insights',
        width: 'w-24',
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        width: 'w-40',
      },
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'raw', label: 'Raw' },
          { value: 'cleaned', label: 'Cleaned' },
          { value: 'processed', label: 'Processed' },
        ],
        defaultValue: 'all',
      },
    ],
    actions: [
      {
        key: 'view',
        label: 'View/Edit',
        icon: Edit3,
      },
      {
        key: 'clean',
        label: 'Clean Transcript',
        icon: Sparkles,
        condition: (item) => item.status === 'raw',
      },
      {
        key: 'generateInsights',
        label: 'Generate Insights',
        icon: Sparkles,
        condition: (item) => item.status === 'cleaned',
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        requireConfirm: true,
        confirmMessage: 'Are you sure you want to delete this transcript?',
      },
    ],
    bulkActions: [
      {
        key: 'bulkDelete',
        label: 'Delete Selected',
        icon: Trash2,
        variant: 'destructive',
        requireConfirm: true,
        confirmMessage: 'Are you sure you want to delete {count} transcripts?',
      },
      {
        key: 'bulkClean',
        label: 'Clean Selected',
        icon: Sparkles,
        condition: (item) => item.status === 'raw',
      },
    ],
    defaultSort: {
      field: 'createdAt',
      order: 'desc',
    },
    statusField: 'status',
    searchableFields: ['title', 'content'],
  },
  
  insights: {
    name: 'Insights',
    icon: Lightbulb,
    emptyIcon: Lightbulb,
    emptyTitle: 'No insights found',
    emptyMessage: 'Generate insights from your transcripts to get started',
    columns: [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
      },
      {
        key: 'category',
        label: 'Category',
        sortable: true,
        width: 'w-32',
      },
      {
        key: 'postType',
        label: 'Type',
        width: 'w-32',
      },
      {
        key: 'score',
        label: 'Score',
        sortable: true,
        width: 'w-24',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 'w-32',
      },
      {
        key: 'posts',
        label: 'Posts',
        width: 'w-24',
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        width: 'w-40',
      },
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'needs_review', label: 'Needs Review' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
        defaultValue: 'all',
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'all', label: 'All Categories' },
          { value: 'business', label: 'Business' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'personal', label: 'Personal Development' },
          { value: 'technology', label: 'Technology' },
          { value: 'health', label: 'Health & Wellness' },
          { value: 'finance', label: 'Finance' },
          { value: 'education', label: 'Education' },
          { value: 'other', label: 'Other' },
        ],
        defaultValue: 'all',
      },
      {
        key: 'postType',
        label: 'Post Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'tip', label: 'Quick Tip' },
          { value: 'story', label: 'Story' },
          { value: 'list', label: 'List' },
          { value: 'question', label: 'Question' },
          { value: 'announcement', label: 'Announcement' },
          { value: 'insight', label: 'Insight' },
        ],
        defaultValue: 'all',
      },
      {
        key: 'scoreRange',
        label: 'Score Range',
        type: 'range',
        min: 0,
        max: 20,
        defaultValue: [0, 20],
      },
    ],
    actions: [
      {
        key: 'view',
        label: 'View/Edit',
        icon: Edit3,
      },
      {
        key: 'approve',
        label: 'Approve',
        icon: CheckCircle,
        condition: (item) => item.status === 'needs_review',
      },
      {
        key: 'reject',
        label: 'Reject',
        icon: XCircle,
        condition: (item) => item.status === 'needs_review',
      },
      {
        key: 'generatePosts',
        label: 'Generate Posts',
        icon: Sparkles,
        condition: (item) => item.status === 'approved' && (!(item as any).posts || (item as any).posts?.length === 0),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        requireConfirm: true,
        confirmMessage: 'Are you sure you want to delete this insight?',
      },
    ],
    bulkActions: [
      {
        key: 'bulkApprove',
        label: 'Approve Selected',
        icon: CheckCircle,
      },
      {
        key: 'bulkReject',
        label: 'Reject Selected',
        icon: XCircle,
      },
      {
        key: 'bulkDelete',
        label: 'Delete Selected',
        icon: Trash2,
        variant: 'destructive',
        requireConfirm: true,
        confirmMessage: 'Are you sure you want to delete {count} insights?',
      },
    ],
    defaultSort: {
      field: 'score',
      order: 'desc',
    },
    statusField: 'status',
    searchableFields: ['title', 'content', 'keyPoints'],
  },
  
  posts: {
    name: 'Posts',
    icon: Edit3,
    emptyIcon: Edit3,
    emptyTitle: 'No posts found',
    emptyMessage: 'Generate posts from approved insights to get started',
    columns: [
      {
        key: 'content',
        label: 'Content',
        sortable: false,
      },
      {
        key: 'platform',
        label: 'Platform',
        sortable: true,
        width: 'w-32',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 'w-32',
      },
      {
        key: 'scheduledFor',
        label: 'Scheduled',
        sortable: true,
        width: 'w-40',
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        width: 'w-40',
      },
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'draft', label: 'Draft' },
          { value: 'approved', label: 'Approved' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'published', label: 'Published' },
        ],
        defaultValue: 'all',
      },
      {
        key: 'platform',
        label: 'Platform',
        type: 'select',
        options: [
          { value: 'all', label: 'All Platforms' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'twitter', label: 'Twitter' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'instagram', label: 'Instagram' },
        ],
        defaultValue: 'all',
      },
    ],
    actions: [
      {
        key: 'view',
        label: 'View/Edit',
        icon: Edit3,
      },
      {
        key: 'approve',
        label: 'Approve',
        icon: CheckCircle,
        condition: (item) => item.status === 'draft',
      },
      {
        key: 'schedule',
        label: 'Schedule',
        icon: Calendar,
        condition: (item) => item.status === 'approved',
      },
      {
        key: 'publish',
        label: 'Publish Now',
        icon: Send,
        condition: (item) => item.status === 'approved' || item.status === 'scheduled',
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        requireConfirm: true,
        confirmMessage: 'Are you sure you want to delete this post?',
      },
    ],
    bulkActions: [
      {
        key: 'bulkApprove',
        label: 'Approve Selected',
        icon: CheckCircle,
      },
      {
        key: 'bulkSchedule',
        label: 'Schedule Selected',
        icon: Calendar,
      },
      {
        key: 'bulkDelete',
        label: 'Delete Selected',
        icon: Trash2,
        variant: 'destructive',
        requireConfirm: true,
        confirmMessage: 'Are you sure you want to delete {count} posts?',
      },
    ],
    defaultSort: {
      field: 'createdAt',
      order: 'desc',
    },
    statusField: 'status',
    searchableFields: ['content', 'hashtags'],
  },
};

// Helper function to get columns for a view
export function getColumnsForView(view: ContentView): ColumnConfig[] {
  return VIEW_CONFIGS[view].columns;
}

// Helper function to get filters for a view
export function getFiltersForView(view: ContentView): FilterConfig[] {
  return VIEW_CONFIGS[view].filters;
}

// Helper function to get actions for a view
export function getActionsForView(view: ContentView): ActionConfig[] {
  return VIEW_CONFIGS[view].actions;
}

// Helper to check if an action is available for an item
export function isActionAvailable(action: ActionConfig, item: ContentItem): boolean {
  if (!action.condition) return true;
  return action.condition(item);
}