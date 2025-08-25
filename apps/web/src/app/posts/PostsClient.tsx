'use client';

import { useState, useMemo } from 'react';
import { PostView } from './page';
import PostCard from './components/PostCard';
import PostModal from './components/PostModal';
import { PostsActionBar } from './components/PostsActionBar';
import { PostsFilters } from './components/PostsFilters';
import { PostsStatusTabs } from './components/PostsStatusTabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit3 } from 'lucide-react';

interface PostsClientProps {
  initialPosts: PostView[];
  initialFilter?: string;
}

export default function PostsClient({ initialPosts, initialFilter = 'needs_review' }: PostsClientProps) {
  const [posts, setPosts] = useState<PostView[]>(initialPosts);
  const [activeStatusFilter, setActiveStatusFilter] = useState(initialFilter);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Apply status filter
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === activeStatusFilter);
    }

    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(post => post.platform === platformFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.fullContent.toLowerCase().includes(query) ||
        post.insightTitle?.toLowerCase().includes(query) ||
        post.transcriptTitle?.toLowerCase().includes(query) ||
        post.hashtags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = sortBy.split('-');
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'platform':
          aValue = a.platform.toLowerCase();
          bValue = b.platform.toLowerCase();
          break;
        case 'estimatedEngagementScore':
          aValue = a.estimatedEngagementScore || 0;
          bValue = b.estimatedEngagementScore || 0;
          break;
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [posts, activeStatusFilter, platformFilter, searchQuery, sortBy]);

  // Handle individual post actions
  const handleAction = async (action: string, post: PostView) => {
    try {
      if (action === 'approve' || action === 'reject' || action === 'archive') {
        const newStatus = action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' :
                         'archived';

        const response = await fetch(`/api/posts?id=${post.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Update the post in the state
            setPosts(prev => prev.map(p => 
              p.id === post.id 
                ? { ...p, status: newStatus as any, updatedAt: new Date(result.data.updatedAt) }
                : p
            ));
          }
        }
      } else if (action === 'review') {
        // Move back to needs review
        const response = await fetch(`/api/posts?id=${post.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'needs_review'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPosts(prev => prev.map(p => 
              p.id === post.id 
                ? { ...p, status: 'needs_review' as any, updatedAt: new Date(result.data.updatedAt) }
                : p
            ));
          }
        }
      } else if (action === 'edit') {
        // Open modal for editing
        setSelectedPost(post);
        setShowModal(true);
      } else {
        // Handle other actions (schedule, etc.)
        console.log(`Action: ${action} on post: ${post.title}`);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedPosts.length === 0) return;

    try {
      // Since we don't have a bulk API endpoint yet, we'll do individual requests
      for (const postId of selectedPosts) {
        const newStatus = action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' :
                         action === 'archive' ? 'archived' : 'needs_review';

        await fetch(`/api/posts?id=${postId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus
          }),
        });
      }
      
      // Update posts in state
      const newStatus = action === 'approve' ? 'approved' : 
                       action === 'reject' ? 'rejected' :
                       action === 'archive' ? 'archived' : 'needs_review';
      
      setPosts(prev => prev.map(post => 
        selectedPosts.includes(post.id)
          ? { ...post, status: newStatus as any, updatedAt: new Date() }
          : post
      ));
      
      // Clear selection
      setSelectedPosts([]);
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
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

    try {
      const response = await fetch(`/api/posts?id=${selectedPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save post');
      }

      // Update the post in the state
      setPosts(prev => prev.map(p => 
        p.id === selectedPost.id 
          ? { ...p, ...updatedData, updatedAt: new Date(result.data.updatedAt) }
          : p
      ));
      setShowModal(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('Failed to save post:', error);
      throw error; // Re-throw to let PostModal handle the error display
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
        <p className="mt-2 text-gray-600">
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
        posts={posts}
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