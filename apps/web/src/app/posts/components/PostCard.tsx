'use client';

import { useState } from 'react';
import type { PostView } from '@/types';
import { getPlatformConfig } from '@/constants/platforms';
import { ContentCard, DateDisplay, type UnifiedStatus } from '@/components/ContentCard';
import { getNextAction } from '@/constants/statuses';
import { CharacterCount } from '@/components/CharacterCount';
import { ExpandableContent } from '@/components/ExpandableContent';
import Link from 'next/link';
import { 
  Edit3, 
  Check, 
  X, 
  Archive, 
  Calendar, 
  Eye,
  Trash2,
  RotateCcw,
  FileText,
  Sparkles
} from 'lucide-react';

interface PostCardProps {
  post: PostView;
  onAction: (action: string, post: PostView) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  loadingStates?: Record<string, boolean>;
}

export default function PostCard({ post, onAction, isSelected, onSelect, loadingStates = {} }: PostCardProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const platform = getPlatformConfig(post.platform);
  
  // Helper to get loading state for specific action
  const isActionLoading = (action: string) => loadingStates[`${action}-${post.id}`] || false;
  
  // Get primary action based on status
  const getPrimaryAction = () => {
    switch (post.status) {
      case 'needs_review':
        return {
          label: 'Approve',
          onClick: () => onAction('approve', post),
          icon: Check,
          loading: isActionLoading('approve'),
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700'
        };
      case 'approved':
        return {
          label: 'Schedule',
          onClick: () => onAction('schedule', post),
          icon: Calendar,
          loading: isActionLoading('schedule'),
          variant: 'default' as const,
          className: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'rejected':
        return {
          label: 'Review Again',
          onClick: () => onAction('review', post),
          icon: RotateCcw,
          loading: isActionLoading('review'),
          variant: 'outline' as const
        };
      default:
        return undefined;
    }
  };
  
  // Build secondary actions
  const getSecondaryActions = () => {
    const actions = [];
    
    if (post.status === 'needs_review') {
      actions.push({
        label: 'Reject',
        onClick: () => onAction('reject', post),
        icon: X,
        loading: isActionLoading('reject'),
        variant: 'ghost' as const
      });
    }
    
    actions.push({
      label: 'Edit',
      onClick: () => onAction('edit', post),
      icon: Edit3,
      loading: isActionLoading('edit'),
      variant: 'ghost' as const
    });
    
    return actions;
  };
  
  // Build menu actions
  const menuActions = [
    {
      label: 'View Details',
      onClick: () => {
        onAction('view', post);
        setShowActionMenu(false);
      },
      icon: Eye
    },
    {
      label: 'Archive',
      onClick: () => {
        onAction('archive', post);
        setShowActionMenu(false);
      },
      icon: Archive
    },
    {
      label: 'Delete',
      onClick: () => {
        onAction('delete', post);
        setShowActionMenu(false);
      },
      icon: Trash2,
      danger: true
    }
  ];

  return (
    <ContentCard isSelected={isSelected}>
      <ContentCard.Header>
        <ContentCard.Title
          title={post.title}
          icon={FileText}
          isSelected={isSelected}
          onSelect={(selected) => onSelect(post.id, selected)}
        />
        
        <ContentCard.Meta>
          <DateDisplay date={post.createdAt} />
          <CharacterCount 
            count={post.content?.length || 0} 
            limit={platform.charLimit} 
            platform={post.platform} 
          />
          {post.scheduledFor && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <DateDisplay date={post.scheduledFor} />
            </span>
          )}
        </ContentCard.Meta>
        
        <ContentCard.Badges
          status={post.status as UnifiedStatus}
          badges={[
            {
              label: platform.label,
              variant: 'outline',
              icon: platform.icon,
              className: `${platform.color} text-white border-none`
            }
          ]}
        />
      </ContentCard.Header>
      
      <ContentCard.Body>
        {/* Content preview */}
        <div className="text-sm text-gray-700 mb-3">
          <ExpandableContent 
            content={post.content}
            maxLength={200}
            maxLines={3}
            expandText="Show full post"
            collapseText="Show less"
          />
        </div>
        
        {/* Related content links */}
        <div className="flex flex-wrap gap-3">
          {post.insightId && post.insightTitle && (
            <ContentCard.Link
              href={`/insights?highlight=${post.insightId}`}
              label={`From insight: ${post.insightTitle.substring(0, 30)}...`}
              icon={Sparkles}
            />
          )}
          {post.transcriptId && post.transcriptTitle && (
            <ContentCard.Link
              href={`/transcripts?highlight=${post.transcriptId}`}
              label={`Source: ${post.transcriptTitle.substring(0, 30)}...`}
              icon={FileText}
            />
          )}
        </div>
      </ContentCard.Body>
      
      <ContentCard.Actions
        primaryAction={getPrimaryAction()}
        secondaryActions={getSecondaryActions()}
        menuActions={menuActions}
        showMenu={showActionMenu}
        onToggleMenu={() => setShowActionMenu(!showActionMenu)}
      />
    </ContentCard>
  );
}