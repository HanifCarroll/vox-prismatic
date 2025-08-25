'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Calendar,
  ChevronRight,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendar } from './CalendarContext';
import { PlatformIcon } from './PlatformIcon';
import type { ApprovedPost, Platform } from '@/types/scheduler';

/**
 * ApprovedPostsSidebar - Shows approved posts available for scheduling
 */
export function ApprovedPostsSidebar() {
  const { state, actions, setModal } = useCalendar();
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  // Filter approved posts based on search and platform
  const filteredPosts = state.approvedPosts.filter((post: ApprovedPost) => {
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
    
    return matchesSearch && matchesPlatform;
  });

  // Handle post selection - directly open modal with post selected
  const handlePostSelect = (post: ApprovedPost) => {
    // Open modal with the post data directly
    setModal({
      isOpen: true,
      mode: "create",
      postId: post.id,
      postData: {
        id: post.id,
        title: post.title,
        content: post.content,
        platform: post.platform,
      },
      initialPlatform: post.platform,
      onSave: async (data: any) => {
        // Schedule the post
        const response = await fetch('/api/scheduler/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: post.id,
            platform: data.platform,
            content: data.content,
            datetime: data.scheduledTime,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to schedule post');
        }

        await actions.refreshEvents();
        setModal({ isOpen: false, mode: "create" });
      },
      onClose: () => setModal({ isOpen: false, mode: "create" }),
    });
  };

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className={`
      bg-white border-r border-gray-200 flex flex-col transition-all duration-300
      ${isExpanded ? 'w-64' : 'w-12'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Approved Posts</h2>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search and Filters */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>

            {/* Platform Filter */}
            <Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value as Platform | 'all')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="x">X (Twitter)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Posts List */}
      {isExpanded && (
        <div className="flex-1 overflow-auto">
          {state.isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading posts...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchQuery || platformFilter !== 'all' 
                ? 'No posts match your filters' 
                : 'No approved posts available'
              }
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg p-3 cursor-pointer transition-colors"
                  onClick={() => handlePostSelect(post)}
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-2">
                    <PlatformIcon platform={post.platform} size="sm" />
                    <Badge variant="secondary" className="text-xs">
                      {post.characterCount || 0} chars
                    </Badge>
                  </div>

                  {/* Post Title */}
                  <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
                    {post.title}
                  </h3>

                  {/* Post Content Preview */}
                  <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                    {truncateContent(post.content)}
                  </p>

                  {/* Post Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{post.insightTitle && `From: ${post.insightTitle.substring(0, 20)}...`}</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Schedule</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            {filteredPosts.length} of {state.approvedPosts.length} posts
          </div>
        </div>
      )}
    </div>
  );
}