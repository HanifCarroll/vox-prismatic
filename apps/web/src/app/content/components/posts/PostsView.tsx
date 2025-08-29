"use client";

import { useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { PostView } from "@/types";
import { PostStatus } from "@/types";
import { PostsDataTable } from "./PostsDataTable";
import PostModal from "../modals/PostModal";
import { SchedulePostModal } from "../modals/SchedulePostModal";
import { BulkScheduleModal } from "@/components/BulkScheduleModal";
import {
  useUpdatePostAction,
  useBulkUpdatePostsAction,
} from "../../hooks/use-server-actions";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { useOperationLoadingStates } from "@/hooks/useLoadingState";
import { ResponsiveContentView } from "../ResponsiveContentView";
import { format } from "date-fns";
import { useHybridDataStrategy } from "../../hooks/useHybridDataStrategy";
import { usePagination } from "../../hooks/usePagination";
import { MobilePagination } from "../mobile/MobilePagination";
import { usePerformanceMonitor } from "@/lib/performance-monitor";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface PostsViewProps {
  posts: PostView[];
  isLoading: boolean;
  searchQuery: string;
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  statusFilter: string;
  platformFilter: string;
  sortBy: string;
  onStatusFilterChange: (filter: string) => void;
  onPlatformFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onShowPostModal: (post: PostView) => void;
  onShowScheduleModal: (post: PostView) => void;
  onShowBulkScheduleModal: () => void;
  onSearchQueryChange: (query: string) => void;
  onHidePostModal: () => void;
  onHideScheduleModal: () => void;
  onHideBulkScheduleModal: () => void;
  selectedPost: PostView | null;
  postToSchedule: PostView | null;
  showPostModal: boolean;
  showScheduleModal: boolean;
  showBulkScheduleModal: boolean;
  totalCount?: number;  // Total items from server
  useServerFiltering?: boolean;  // Override for hybrid strategy
  globalCounts?: {
    total: number;
    needs_review: number;
    approved: number;
    scheduled: number;
    published: number;
    failed: number;
    rejected: number;
    archived: number;
  };
}

export default function PostsView({ 
  posts, 
  isLoading,
  searchQuery,
  selectedItems,
  onSelectionChange,
  statusFilter,
  platformFilter,
  sortBy,
  onStatusFilterChange,
  onPlatformFilterChange,
  onSortChange,
  onShowPostModal,
  onShowScheduleModal,
  onShowBulkScheduleModal,
  onSearchQueryChange,
  onHidePostModal,
  onHideScheduleModal,
  onHideBulkScheduleModal,
  selectedPost,
  postToSchedule,
  showPostModal,
  showScheduleModal,
  showBulkScheduleModal,
  totalCount = 0,
  useServerFiltering: forceServerFiltering,
  globalCounts
}: PostsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  const { isLoading: isOperationLoading, withOperationLoading } = useOperationLoadingStates();
  const { startMark, endMark, trackDataLoad } = usePerformanceMonitor();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Server Actions
  const updatePostAction = useUpdatePostAction();
  const bulkUpdateAction = useBulkUpdatePostsAction();
  
  // Determine data loading strategy
  const { 
    strategy,
    shouldPaginate,
    shouldUseServerFilters,
    pageSize,
  } = useHybridDataStrategy({
    totalItems: totalCount || posts.length,
    isMobile,
    isTablet,
    forceStrategy: forceServerFiltering ? 'server' : undefined,
  });
  
  // Pagination state (only for server-side filtering)
  const pagination = usePagination({
    totalItems: totalCount || posts.length,
    initialPageSize: pageSize,
  });

  // Track data loading performance
  useEffect(() => {
    if (!isLoading && posts.length > 0) {
      trackDataLoad({
        strategy,
        itemCount: posts.length,
        filteredCount: posts.length, // Will use filteredPosts.length after it's defined
        pageSize,
        duration: 0, // Will be tracked by query hooks
      });
    }
  }, [posts.length, strategy, pageSize, isLoading, trackDataLoad]);

  // Parse sorting
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"];

  // Client-side filtering - only used when not using server filtering
  const filteredPosts = useMemo(() => {
    startMark('client-filter');
    
    // If using server-side filtering, posts are already filtered
    if (shouldUseServerFilters) {
      endMark('client-filter', { strategy: 'server', skipped: true });
      return posts;
    }
    
    // Early return if no filters active and default sort
    if (statusFilter === "all" && platformFilter === "all" && !searchQuery && sortField === "createdAt" && sortOrder === "desc") {
      endMark('client-filter', { strategy: 'client', filtered: false });
      return posts;
    }

    let filtered = posts;

    // Apply filters only if needed
    if (statusFilter !== "all" || platformFilter !== "all" || searchQuery) {
      filtered = posts.filter((post) => {
        // Status filter
        if (statusFilter !== "all" && post.status !== statusFilter) return false;
        
        // Platform filter  
        if (platformFilter !== "all" && post.platform !== platformFilter) return false;
        
        // Search filter - optimize by caching lowercase values
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const searchableText = [
            post.title,
            post.content,
            post.insightTitle || '',
            post.transcriptTitle || ''
          ].join(' ').toLowerCase();
          
          if (!searchableText.includes(query)) return false;
        }
        
        return true;
      });
    }

    // Sort only if not default order or if filtered
    if (sortField !== "createdAt" || sortOrder !== "desc" || filtered !== posts) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any = a[sortField as keyof PostView];
        let bVal: any = b[sortField as keyof PostView];

        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();
        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }
    
    endMark('client-filter', { 
      strategy: 'client', 
      itemsIn: posts.length,
      itemsOut: filtered.length 
    });

    return filtered;
  }, [
    posts,
    statusFilter,
    platformFilter,
    searchQuery,
    sortField,
    sortOrder,
    shouldUseServerFilters,
    startMark,
    endMark,
  ]);

  // Handle individual post actions
  const handleAction = async (action: string, post: PostView) => {
    // Actions that don't require loading states
    if (action === "edit" || action === "view" || action === "schedule") {
      if (action === "edit" || action === "view") {
        onShowPostModal(post);
      } else if (action === "schedule") {
        onShowScheduleModal(post);
      }
      return;
    }

    // Check if action requires confirmation
    const destructiveActions = ["reject", "archive"];
    if (destructiveActions.includes(action)) {
      const actionLabels = {
        reject: {
          title: "Reject Post",
          desc: "This post will be marked as rejected and moved out of the review queue.",
          verb: "Reject",
        },
        archive: {
          title: "Archive Post",
          desc: "This post will be archived and removed from active workflows.",
          verb: "Archive",
        },
      };

      const label = actionLabels[action as keyof typeof actionLabels];
      const confirmed = await confirm({
        title: label.title,
        description: label.desc,
        confirmText: label.verb,
        variant: "destructive",
      });

      if (!confirmed) return;
    }

    // Actions that require async operations with loading states
    const operationKey = `${action}-${post.id}`;

    await withOperationLoading(operationKey, async () => {
      if (action === "approve" || action === "reject" || action === "archive") {
        const newStatus =
          action === "approve"
            ? PostStatus.APPROVED
            : action === "reject"
            ? PostStatus.REJECTED
            : PostStatus.ARCHIVED;

        try {
          await updatePostAction(post.id, {
            status: newStatus,
          });
          toast.success(`Post ${action}d successfully`);
        } catch (error) {
          toast.error(`Failed to ${action} post`);
          throw error;
        }
      } else if (action === "review") {
        try {
          await updatePostAction(post.id, {
            status: PostStatus.NEEDS_REVIEW,
          });
          toast.success("Post moved back to review");
        } catch (error) {
          toast.error("Failed to move post to review");
          throw error;
        }
      }
    });
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return;

    // Handle bulk schedule separately
    if (action === "schedule") {
      onShowBulkScheduleModal();
      return;
    }

    // Check if bulk action requires confirmation
    const destructiveBulkActions = ["reject", "archive"];
    if (destructiveBulkActions.includes(action)) {
      const count = selectedItems.length;
      const actionLabels = {
        reject: {
          title: `Reject ${count} Posts`,
          desc: `This will reject ${count} selected posts and move them out of the review queue.`,
          verb: "Reject All",
        },
        archive: {
          title: `Archive ${count} Posts`,
          desc: `This will archive ${count} selected posts and remove them from active workflows.`,
          verb: "Archive All",
        },
      };

      const label = actionLabels[action as keyof typeof actionLabels];
      const confirmed = await confirm({
        title: label.title,
        description: label.desc,
        confirmText: label.verb,
        variant: "destructive",
      });

      if (!confirmed) return;
    }

    try {
      await bulkUpdateAction({
        action,
        postIds: selectedItems,
      });
      const count = selectedItems.length;
      toast.success(`Successfully ${action}d ${count} posts`);
      onSelectionChange([]);
    } catch (error) {
      toast.error(`Failed to ${action} selected posts`);
    }
  };

  // Selection handlers - delegated to parent
  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      onSelectionChange(posts.map(p => p.id));
    } else {
      onSelectionChange([]);
    }
  };

  // Handle modal save
  const handleModalSave = async (updatedData: Partial<PostView>) => {
    if (!selectedPost) {
      throw new Error("No post selected for saving");
    }

    try {
      await updatePostAction(selectedPost.id, updatedData);
      onHidePostModal();
    } catch (error) {
      throw error; // Re-throw to let PostModal handle the error display
    }
  };

  // Handle quick scheduling
  const handleSchedulePost = async (postId: string, scheduledFor: Date) => {
    try {
      const response = await apiClient.post(`/api/posts/${postId}/schedule`, {
        scheduledFor: scheduledFor.toISOString(),
      });

      if (response.success) {
        toast.success("Post scheduled", {
          description: `Scheduled for ${format(
            scheduledFor,
            "MMM d, yyyy 'at' h:mm a"
          )}`,
        });

        // Update the post status locally
        await updatePostAction(postId, {
          status: PostStatus.SCHEDULED,
        });

        onHideScheduleModal();
      } else {
        throw new Error(response.error || "Failed to schedule post");
      }
    } catch (error) {
      toast.error("Failed to schedule post", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  };

  // Handle bulk schedule
  const handleBulkSchedule = async (
    schedules: Array<{ postId: string; scheduledFor: Date }>
  ) => {
    try {
      // Schedule each post
      const results = await Promise.allSettled(
        schedules.map(async ({ postId, scheduledFor }) => {
          const response = await apiClient.post("/api/posts/schedule", {
            postId,
            scheduledFor: scheduledFor.toISOString(),
          });

          if (response.success) {
            // Update local state
            await updatePostAction(postId, {
              status: PostStatus.SCHEDULED,
            });
          }

          return response;
        })
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful > 0) {
        toast.success(`Successfully scheduled ${successful} posts`);
      }

      if (failed > 0) {
        toast.warning(`Failed to schedule ${failed} posts`);
      }

      // Clear selection after bulk scheduling
      onSelectionChange([]);
      onHideBulkScheduleModal();
    } catch (error) {
      toast.error("Bulk scheduling failed");
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Edit3 className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading posts...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Posts Content */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <Edit3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || platformFilter !== "all"
              ? "No matching posts found"
              : statusFilter === "needs_review"
              ? "No posts need review"
              : `No ${
                  statusFilter === "all" ? "" : statusFilter
                } posts found`}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || platformFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : statusFilter === "needs_review"
              ? "All posts have been reviewed. Great work!"
              : "Generate posts from approved insights, or check other status tabs"}
          </p>
          {(searchQuery || platformFilter !== "all") && (
            <Button
              onClick={() => {
                onSearchQueryChange("");
                onPlatformFilterChange("all");
              }}
              variant="default"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <ResponsiveContentView
          type="post"
          items={filteredPosts}
          selectedIds={selectedItems}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onAction={handleAction}
          isLoading={isLoading}
          emptyMessage="No posts found"
          loadingStates={{
            ...Object.fromEntries(
              filteredPosts.flatMap((post) => [
                [
                  `approve-${post.id}`,
                  isOperationLoading(`approve-${post.id}`),
                ],
                [`reject-${post.id}`, isOperationLoading(`reject-${post.id}`)],
                [
                  `archive-${post.id}`,
                  isOperationLoading(`archive-${post.id}`),
                ],
                [`review-${post.id}`, isOperationLoading(`review-${post.id}`)],
                [`edit-${post.id}`, isOperationLoading(`edit-${post.id}`)],
                [
                  `schedule-${post.id}`,
                  isOperationLoading(`schedule-${post.id}`),
                ],
              ])
            ),
          }}
          renderTable={() => (
            <PostsDataTable
              posts={filteredPosts}
              selectedPosts={selectedItems}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onAction={handleAction}
              loadingStates={{
                ...Object.fromEntries(
                  filteredPosts.flatMap((post) => [
                    [
                      `approve-${post.id}`,
                      isOperationLoading(`approve-${post.id}`),
                    ],
                    [`reject-${post.id}`, isOperationLoading(`reject-${post.id}`)],
                    [
                      `archive-${post.id}`,
                      isOperationLoading(`archive-${post.id}`),
                    ],
                    [`review-${post.id}`, isOperationLoading(`review-${post.id}`)],
                    [`edit-${post.id}`, isOperationLoading(`edit-${post.id}`)],
                    [
                      `schedule-${post.id}`,
                      isOperationLoading(`schedule-${post.id}`),
                    ],
                  ])
                ),
              }}
            />
          )}
          useVirtualScrolling={filteredPosts.length > 20 && !shouldPaginate}
        />
      )}
      
      {/* Pagination controls for server-side filtering */}
      {shouldPaginate && !isLoading && filteredPosts.length > 0 && (
        <MobilePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={totalCount || filteredPosts.length}
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          pageRange={pagination.pageRange}
          onPageChange={(page) => {
            pagination.goToPage(page);
            // Trigger data refetch with new offset
            // This will be handled by ContentClient integration
          }}
          onPageSizeChange={(size) => {
            pagination.setPageSize(size);
            // Trigger data refetch with new page size
          }}
          variant={isMobile ? 'compact' : 'full'}
          showPageSizeSelector={!isMobile}
          loading={isLoading}
        />
      )}

      {/* Modals */}
      <PostModal
        post={selectedPost}
        isOpen={showPostModal}
        onClose={onHidePostModal}
        onSave={handleModalSave}
      />

      <SchedulePostModal
        post={postToSchedule}
        isOpen={showScheduleModal}
        onClose={onHideScheduleModal}
        onSchedule={handleSchedulePost}
      />

      <ConfirmationDialog {...confirmationProps} />

      <BulkScheduleModal
        posts={posts.filter((p) => selectedItems.includes(p.id))}
        isOpen={showBulkScheduleModal}
        onClose={onHideBulkScheduleModal}
        onSchedule={handleBulkSchedule}
      />
    </div>
  );
}