'use client';

import { useState, useMemo } from 'react';
import type { PostView } from '@/types';
import PostCard from './components/PostCard';
import PostModal from './components/PostModal';
import { PostsActionBar } from './components/PostsActionBar';
import { PostsFilters } from './components/PostsFilters';
import { PostsStatusTabs } from './components/PostsStatusTabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit3 } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { usePosts, useUpdatePost, useBulkUpdatePosts } from './hooks/usePostQueries';
import { useRouter } from 'next/navigation';

interface PostsClientProps {
  initialFilter?: string;
}

export default function PostsClient({ initialFilter = 'all' }: PostsClientProps) {
  const toast = useToast();
  const router = useRouter();
  
  // Local UI state
  const [activeStatusFilter, setActiveStatusFilter] = useState(initialFilter);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Parse sorting for TanStack Query
  const [sortField, sortOrder] = sortBy.split('-') as [string, 'asc' | 'desc'];

  // TanStack Query hooks - fetch ALL posts once
  const { data: allPosts = [], isLoading, error } = usePosts({});
  const updatePostMutation = useUpdatePost();
  const bulkUpdateMutation = useBulkUpdatePosts();

  // Client-side filtering (no API calls, no loading states)
  const filteredPosts = useMemo(() => {
    let filtered = [...allPosts];

    // Filter by status
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === activeStatusFilter);
    }

    // Filter by platform
    if (platformFilter !== 'all') {
      filtered = filtered.filter(post => post.platform === platformFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.insightTitle?.toLowerCase().includes(query) ||
        post.transcriptTitle?.toLowerCase().includes(query)
      );
    }

    // Sort posts
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof PostView];
      let bVal: any = b[sortField as keyof PostView];

      // Handle date sorting
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Compare values
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [allPosts, activeStatusFilter, platformFilter, searchQuery, sortField, sortOrder]);

  // Handle individual post actions
  const handleAction = async (action: string, post: PostView) => {
    try {
      if (action === 'approve' || action === 'reject' || action === 'archive') {
        const newStatus = action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' :
                         'archived';
        
        updatePostMutation.mutate({
          id: post.id,
          status: newStatus
        });
      } else if (action === 'review') {
        updatePostMutation.mutate({
          id: post.id,
          status: 'needs_review'
        });
      } else if (action === 'edit') {
        // Open modal for editing
        setSelectedPost(post);
        setShowModal(true);
      } else if (action === 'schedule') {
        // Navigate to scheduler with selected post
        router.push(`/scheduler?postId=${post.id}`);
      } else if (action === 'view') {
        // Open modal for viewing (same as edit but read-only)
        setSelectedPost(post);
        setShowModal(true);
      } else {
        // Handle other potential future actions
        console.log('Unhandled action:', action);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedPosts.length === 0) return;
    
    bulkUpdateMutation.mutate({
      action,
      postIds: selectedPosts
    }, {
      onSuccess: () => {
        setSelectedPosts([]);
      }
    });
  };

  // Handle selection
  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedPosts(prev => [...prev, id]);
    } else {
      setSelectedPosts(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPosts(filteredPosts.map(p => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  // Handle modal save
  const handleModalSave = async (updatedData: Partial<PostView>) => {
    if (!selectedPost) {
      throw new Error('No post selected for saving');
    }

    updatePostMutation.mutate({
      id: selectedPost.id,
      ...updatedData
    }, {
      onSuccess: () => {
        setShowModal(false);
        setSelectedPost(null);
      },
      onError: (error) => {
        throw error; // Re-throw to let PostModal handle the error display
      }
    });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  // Handle error state  
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load posts: {error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Posts</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Manage and edit social media posts generated from insights
        </p>
      </div>

      {/* Action Bar */}
      <PostsActionBar
        selectedPosts={selectedPosts}
        searchQuery={searchQuery}
        showFilters={showFilters}
        onBulkAction={handleBulkAction}
        onSearchChange={setSearchQuery}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Advanced Filters */}
      {showFilters && (
        <PostsFilters
          platformFilter={platformFilter}
          sortBy={sortBy}
          onPlatformChange={setPlatformFilter}
          onSortChange={setSortBy}
          onClearFilters={() => {
            setSearchQuery('');
            setPlatformFilter('all');
            setSortBy('createdAt-desc');
          }}
        />
      )}

      {/* Status Tabs */}
      <PostsStatusTabs
        activeFilter={activeStatusFilter}
        posts={allPosts}
        onFilterChange={setActiveStatusFilter}
      />

      {/* Select All */}
      {filteredPosts.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            checked={selectedPosts.length === filteredPosts.length}
            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
          />
          <label className="text-sm text-gray-700">
            Select all {filteredPosts.length} posts
          </label>
        </div>
      )}

      {/* Posts Grid */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <Edit3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || platformFilter !== 'all'
                ? 'No matching posts found'
                : activeStatusFilter === 'needs_review'
                ? 'No posts need review'
                : `No ${activeStatusFilter === 'all' ? '' : activeStatusFilter} posts found`}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || platformFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : activeStatusFilter === 'needs_review'
                ? 'All posts have been reviewed. Great work!'
                : 'Generate posts from approved insights, or check other status tabs'
              }
            </p>
            {(searchQuery || platformFilter !== 'all') && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setPlatformFilter('all');
                }}
                variant="default"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onAction={handleAction}
              isSelected={selectedPosts.includes(post.id)}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* Post Modal */}
      <PostModal
        post={selectedPost}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedPost(null);
        }}
        onSave={handleModalSave}
      />
    </div>
  );
}