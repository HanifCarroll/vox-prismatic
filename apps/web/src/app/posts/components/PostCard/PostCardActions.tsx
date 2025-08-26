import { memo, useState, useCallback } from 'react';
import type { PostView } from '@/types';
import type { PostAction } from './types';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Edit3, 
  Check, 
  X, 
  Archive, 
  Calendar, 
  Eye
} from 'lucide-react';

interface PostCardActionsProps {
  post: PostView;
  onAction: (action: string, post: PostView) => void;
}

export const PostCardActions = memo(function PostCardActions({ 
  post, 
  onAction 
}: PostCardActionsProps) {
  const [showActions, setShowActions] = useState(false);

  // Get available actions based on post status
  const getAvailableActions = useCallback((): PostAction[] => {
    const actions: PostAction[] = [];
    
    actions.push({ key: 'edit', label: 'Edit', icon: Edit3 });
    actions.push({ key: 'view', label: 'View Details', icon: Eye });
    
    if (post.status === 'needs_review') {
      actions.push({ key: 'approve', label: 'Approve', icon: Check });
      actions.push({ key: 'reject', label: 'Reject', icon: X, variant: 'destructive' });
    } else if (post.status === 'approved') {
      actions.push({ key: 'schedule', label: 'Schedule', icon: Calendar });
      actions.push({ key: 'review', label: 'Back to Review', icon: Edit3, variant: 'outline' });
    } else if (['rejected', 'published', 'failed'].includes(post.status)) {
      actions.push({ key: 'review', label: 'Back to Review', icon: Edit3, variant: 'outline' });
    }
    
    if (post.status !== 'archived') {
      actions.push({ key: 'archive', label: 'Archive', icon: Archive, variant: 'destructive' });
    }
    
    return actions;
  }, [post.status]);

  const handleActionClick = useCallback((actionKey: string) => {
    onAction(actionKey, post);
    setShowActions(false);
  }, [onAction, post]);

  const availableActions = getAvailableActions();

  return (
    <div className="absolute top-4 right-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowActions(!showActions)}
        className="h-8 w-8 p-0"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      
      {showActions && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowActions(false)}
          />
          
          {/* Actions menu */}
          <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            {availableActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleActionClick(action.key)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});