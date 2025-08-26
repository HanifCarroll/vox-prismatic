import type { PostView } from '@/types';

export interface PostCardProps {
  post: PostView;
  onAction: (action: string, post: PostView) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

export interface PostAction {
  key: string;
  label: string;
  icon: any;
  variant?: 'default' | 'destructive' | 'outline';
}

// Status badge configuration
export const statusConfig = {
  draft: { variant: 'secondary' as const, label: 'Draft', color: 'text-gray-600' },
  needs_review: { variant: 'outline' as const, label: 'Needs Review', color: 'text-yellow-600' },
  approved: { variant: 'default' as const, label: 'Approved', color: 'text-green-600' },
  scheduled: { variant: 'default' as const, label: 'Scheduled', color: 'text-blue-600' },
  published: { variant: 'default' as const, label: 'Published', color: 'text-green-700' },
  failed: { variant: 'destructive' as const, label: 'Failed', color: 'text-red-600' },
  archived: { variant: 'secondary' as const, label: 'Archived', color: 'text-gray-500' }
} as const;