'use client';

import { useCallback } from 'react';
import type { PostView } from '@/types';
import { format } from 'date-fns';
import PostCard from './components/PostCard';
import PostModal from './components/PostModal';
import { SchedulePostModal } from './components/SchedulePostModal';
import { PostsActionBar } from '@/components/ItemActionBar/PostsActionBar';
import { PostsFilters } from './components/PostsFilters';
import { PostsStatusTabs } from '@/components/StatusTabs/PostsStatusTabs';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/lib/toast';
import { usePosts, useUpdatePost, useBulkUpdatePosts } from './hooks/usePostQueries';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

// Import our new hooks
import { useClientFiltering } from '@/hooks/useClientFiltering';
import { useSelection } from '@/hooks/useSelection';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useModalState } from '@/hooks/useModalState';

interface PostsClientProps {
  initialFilter?: string;
}

export default function PostsClientRefactored({ initialFilter = 'all' }: PostsClientProps) {
  const toast = useToast();
  const router = useRouter();
  
  // TanStack Query hooks - fetch ALL posts once
  const { data: allPosts = [], isLoading, error } = usePosts({});
  const updatePostMutation = useUpdatePost();
  const bulkUpdateMutation = useBulkUpdatePosts();

  // Client-side filtering with our new hook
  const {
    filteredItems: filteredPosts,
    filters,
    actions: filterActions,
    itemCount
  } = useClientFiltering(allPosts, initialFilter, {
    searchFields: ['title', 'content', 'insightTitle', 'transcriptTitle'],
    statusField: 'status',
  });

  // Selection management with our new hook
  const { state: selectionState, actions: selectionActions } = useSelection();

  // Bulk actions with our new hook
  const bulkActions = useBulkActions(bulkUpdateMutation, {
    clearSelection: selectionActions.clear,
  });

  // Modal state management with our new hooks
  const editModal = useModalState<PostView>(updatePostMutation, {
    successMessage: 'Post updated successfully',
    errorContext: 'update post',
  });

  const scheduleModal = useModalState<PostView>();

  // Add platform filter to our additional filters
  const handlePlatformFilterChange = useCallback((platform: string) => {
    filterActions.setAdditionalFilter('platform', platform);
  }, [filterActions]);

  // Individual post actions - much cleaner now
  const handleAction = useCallback(async (action: string, post: PostView) => {
    try {
      if (action === 'approve' || action === 'reject') {
        updatePostMutation.mutate({
          id: post.id,
          status: action === 'approve' ? 'approved' : 'rejected'
        });
      } else if (action === 'review') {
        updatePostMutation.mutate({
          id: post.id,
          status: 'needs_review'
        });
      } else if (action === 'edit') {
        editModal.actions.open(post);
      } else if (action === 'schedule') {
        scheduleModal.actions.open(post);
      } else if (action === 'archive') {
        updatePostMutation.mutate({
          id: post.id,
          status: 'archived'
        });
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  }, [updatePostMutation, editModal.actions, scheduleModal.actions]);

  // Schedule post handler
  const handleSchedulePost = useCallback(async (post: PostView, scheduleData: any) => {
    try {
      const response = await apiClient.post(`/api/posts/${post.id}/schedule`, {
        platform: scheduleData.platform,
        scheduledTime: scheduleData.scheduledTime,
        metadata: scheduleData.metadata || {}
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to schedule post');
      }

      const dateTime = new Date(scheduleData.scheduledTime).toLocaleString();
      toast.scheduled(dateTime, scheduleData.platform);
      scheduleModal.actions.close();
    } catch (error) {
      console.error('Failed to schedule post:', error);
      toast.apiError('schedule post', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }, [toast, scheduleModal.actions]);

  // Loading state - much cleaner
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  // Error state - much cleaner
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load posts: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get current platform filter from additional filters
  const platformFilter = filters.platform || 'all';

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page Header */}
      <PageHeader 
        title="Posts"
        subtitle={`${itemCount.filtered} of ${itemCount.total} posts`}
      />

      {/* Action Bar */}
      <PostsActionBar
        selectedPosts={selectionState.selectedItems}
        searchQuery={filters.searchQuery}
        showFilters={filters.showFilters}
        onBulkAction={bulkActions.handleBulkAction}
        onSearchChange={filterActions.setSearchQuery}
        onToggleFilters={() => filterActions.setAdditionalFilter('showFilters', !filters.showFilters)}
      />

      {/* Filters */}
      {filters.showFilters && (
        <PostsFilters
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          platformFilter={platformFilter}
          onSortChange={filterActions.setSort}
          onPlatformFilterChange={handlePlatformFilterChange}
          onClearFilters={filterActions.clearFilters}
        />
      )}

      {/* Status Tabs */}
      <PostsStatusTabs
        activeFilter={filters.activeStatusFilter}
        onFilterChange={filterActions.setActiveStatusFilter}
        posts={allPosts}
      />

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onAction={handleAction}
            isSelected={selectionActions.isSelected(post.id)}
            onSelect={selectionActions.toggle}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No posts found</p>
          <button
            onClick={filterActions.clearFilters}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Edit Modal */}
      <PostModal
        isOpen={editModal.state.isOpen}
        post={editModal.state.selectedItem}
        onClose={editModal.actions.close}
        onSave={editModal.actions.handleSubmit}
        isLoading={editModal.state.isLoading}
      />

      {/* Schedule Modal */}
      <SchedulePostModal
        isOpen={scheduleModal.state.isOpen}
        post={scheduleModal.state.selectedItem}
        onClose={scheduleModal.actions.close}
        onSchedule={(scheduleData) => 
          scheduleModal.state.selectedItem && 
          handleSchedulePost(scheduleModal.state.selectedItem, scheduleData)
        }
      />
    </div>
  );
}