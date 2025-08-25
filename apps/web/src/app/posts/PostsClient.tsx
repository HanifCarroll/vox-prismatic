'use client';

import { useState, useMemo, useEffect } from 'react';
import { PostView } from './page';
import PostCard from './components/PostCard';
import PostModal from './components/PostModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Plus } from 'lucide-react';

// Filter configuration
const statusFilters = [
  { key: 'all', label: 'All Posts', count: (posts: PostView[]) => posts.length },
  { key: 'draft', label: 'Draft', count: (posts: PostView[]) => posts.filter(p => p.status === 'draft').length },
  { key: 'needs_review', label: 'Needs Review', count: (posts: PostView[]) => posts.filter(p => p.status === 'needs_review').length },
  { key: 'approved', label: 'Approved', count: (posts: PostView[]) => posts.filter(p => p.status === 'approved').length },
  { key: 'scheduled', label: 'Scheduled', count: (posts: PostView[]) => posts.filter(p => p.status === 'scheduled').length },
  { key: 'published', label: 'Published', count: (posts: PostView[]) => posts.filter(p => p.status === 'published').length },
  { key: 'failed', label: 'Failed', count: (posts: PostView[]) => posts.filter(p => p.status === 'failed').length },
  { key: 'archived', label: 'Archived', count: (posts: PostView[]) => posts.filter(p => p.status === 'archived').length }
];

const platformOptions = [
  { value: 'all', label: 'All Platforms', icon: '🌐' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'x', label: 'X (Twitter)', icon: '🐦' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '👥' },
  { value: 'youtube', label: 'YouTube', icon: '📺' }
];

const sortOptions = [
  { value: 'createdAt-desc', label: 'Date Created (Newest)' },
  { value: 'createdAt-asc', label: 'Date Created (Oldest)' },
  { value: 'updatedAt-desc', label: 'Last Updated (Recent)' },
  { value: 'updatedAt-asc', label: 'Last Updated (Oldest)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'platform-asc', label: 'Platform (A-Z)' },
  { value: 'estimatedEngagementScore-desc', label: 'Engagement Score (High to Low)' },
  { value: 'estimatedEngagementScore-asc', label: 'Engagement Score (Low to High)' }
];

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
    if (!selectedPost) return;

    try {
      const response = await fetch(`/api/posts?id=${selectedPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the post in the state
          setPosts(prev => prev.map(p => 
            p.id === selectedPost.id 
              ? { ...p, ...updatedData, updatedAt: new Date(result.data.updatedAt) }
              : p
          ));
          setShowModal(false);
          setSelectedPost(null);
        }
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      throw error;
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Left side - Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedPosts.length > 0 && (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {selectedPosts.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleBulkAction('approve')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve Selected
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('reject')}
                    size="sm"
                    variant="destructive"
                  >
                    Reject Selected
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('archive')}
                    size="sm"
                    variant="secondary"
                  >
                    Archive Selected
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Right side - Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "default" : "outline"}
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {platformOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setPlatformFilter('all');
                    setSortBy('createdAt-desc');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <Tabs value={activeStatusFilter} onValueChange={setActiveStatusFilter} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {statusFilters.map((filter) => (
            <TabsTrigger key={filter.key} value={filter.key} className="text-xs">
              <div className="flex items-center gap-1">
                <span className="hidden sm:inline">{filter.label}</span>
                <span className="sm:hidden">{filter.label.split(' ')[0]}</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {filter.count(posts)}
                </Badge>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {statusFilters.map((filter) => (
          <TabsContent key={filter.key} value={filter.key} className="mt-6">
            {/* Content will be the same for all tabs - the filtering happens in filteredPosts */}
          </TabsContent>
        ))}
      </Tabs>

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
            <div className="text-gray-400 text-6xl mb-4">📝</div>
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