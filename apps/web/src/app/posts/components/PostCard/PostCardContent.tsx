import { memo } from 'react';
import type { PostView } from '@/types';
import { CardContent } from '@/components/ui/card';

interface PostCardContentProps {
  post: PostView;
}

export const PostCardContent = memo(function PostCardContent({ post }: PostCardContentProps) {
  // Truncate content for preview
  const truncatedContent = post.content.length > 200 
    ? post.content.substring(0, 200) + '...'
    : post.content;

  return (
    <CardContent className="px-3 sm:px-6">
      <div className="space-y-3">
        {/* Content preview */}
        <div className="text-sm text-gray-700 leading-relaxed">
          <p>{truncatedContent}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{post.characterCount} characters</span>
          <span>•</span>
          <span>
            {post.insightTitle && (
              <>From: <span className="font-medium">{post.insightTitle}</span></>
            )}
          </span>
          {post.transcriptTitle && (
            <>
              <span>•</span>
              <span>Source: <span className="font-medium">{post.transcriptTitle}</span></span>
            </>
          )}
        </div>
      </div>
    </CardContent>
  );
});