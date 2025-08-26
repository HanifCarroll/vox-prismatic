import { memo } from 'react';
import type { PostCardProps } from './types';
import { Card } from '@/components/ui/card';
import { PostCardHeader } from './PostCardHeader';
import { PostCardContent } from './PostCardContent';
import { PostCardActions } from './PostCardActions';
import { PostCardFooter } from './PostCardFooter';

/**
 * Refactored PostCard component with sub-components
 * Now focused, testable, and maintainable
 */
export const PostCard = memo(function PostCard({ 
  post, 
  onAction, 
  isSelected, 
  onSelect 
}: PostCardProps) {
  return (
    <Card className={`relative transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
    }`}>
      <PostCardHeader 
        post={post}
        isSelected={isSelected}
        onSelect={onSelect}
      />
      
      <PostCardContent post={post} />
      
      <PostCardActions 
        post={post}
        onAction={onAction}
      />
      
      <PostCardFooter post={post} />
    </Card>
  );
});

// Export sub-components for testing and reuse
export { PostCardHeader } from './PostCardHeader';
export { PostCardContent } from './PostCardContent';
export { PostCardActions } from './PostCardActions';
export { PostCardFooter } from './PostCardFooter';
export type { PostCardProps, PostAction } from './types';

export default PostCard;