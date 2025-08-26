import { memo } from 'react';
import type { PostView } from '@/types';
import { CardFooter } from '@/components/ui/card';
import { DateDisplay } from '@/components/date';

interface PostCardFooterProps {
  post: PostView;
}

export const PostCardFooter = memo(function PostCardFooter({ post }: PostCardFooterProps) {
  return (
    <CardFooter className="pt-3 px-3 sm:px-6 border-t border-gray-100">
      <div className="flex items-center justify-between w-full text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-medium">Created:</span>{' '}
            <DateDisplay date={post.createdAt} format="short" />
          </div>
          {post.updatedAt && post.updatedAt !== post.createdAt && (
            <div>
              <span className="font-medium">Updated:</span>{' '}
              <DateDisplay date={post.updatedAt} format="short" />
            </div>
          )}
        </div>

        {/* Additional metadata */}
        <div className="flex items-center gap-2">
          {post.status === 'scheduled' && (
            <div className="text-blue-600 font-medium">
              📅 Scheduled
            </div>
          )}
          {post.status === 'published' && (
            <div className="text-green-600 font-medium">
              ✅ Published
            </div>
          )}
          {post.status === 'failed' && (
            <div className="text-red-600 font-medium">
              ❌ Failed
            </div>
          )}
        </div>
      </div>
    </CardFooter>
  );
});