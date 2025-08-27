"use client";

import { useState, useMemo, useCallback } from "react";
import { PostsActionBar } from "../action-bars/PostsActionBar";
import { PostsStatusTabs } from "../status-tabs/PostsStatusTabs";
import { PostsFilters } from "../filters/PostsFilters";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { PostView } from "@/types";
import { PostsDataTable } from "./PostsDataTable";
import PostModal from "../modals/PostModal";
import { SchedulePostModal } from "../modals/SchedulePostModal";
import { BulkScheduleModal } from "@/components/BulkScheduleModal";
import {
  useUpdatePost,
  useBulkUpdatePosts,
} from "../../hooks/usePostQueries";
import { SmartSelection } from "@/components/SmartSelection";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { useOperationLoadingStates } from "@/hooks/useLoadingState";
import { format } from "date-fns";

interface PostsViewProps {
  posts: PostView[];
  isLoading: boolean;
}

export default function PostsView({ posts, isLoading }: PostsViewProps) {
  const toast = useToast();
  const { confirm, confirmationProps } = useConfirmation();
  const { isLoading: isOperationLoading, withOperationLoading } = useOperationLoadingStates();

  // Mutations
  const updatePostMutation = useUpdatePost();
  const bulkUpdateMutation = useBulkUpdatePosts();

  // Local UI state
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [postToSchedule, setPostToSchedule] = useState<PostView | null>(null);
  const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);

  // Parse sorting
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"];

  // Client-side filtering
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Filter by status
    if (activeStatusFilter !== "all") {
      filtered = filtered.filter((post) => post.status === activeStatusFilter);
    }

    // Filter by platform
    if (platformFilter !== "all") {
      filtered = filtered.filter((post) => post.platform === platformFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
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

    return filtered;
  }, [
    posts,
    activeStatusFilter,
    platformFilter,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  // Handle individual post actions
  const handleAction = async (action: string, post: PostView) => {
    // Actions that don't require loading states
    if (action === "edit" || action === "view" || action === "schedule") {
      if (action === "edit" || action === "view") {
        setSelectedPost(post);
        setShowModal(true);
      } else if (action === "schedule") {
        setPostToSchedule(post);
        setShowScheduleModal(true);
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
            ? "approved"
            : action === "reject"
            ? "rejected"
            : "archived";

        return new Promise<void>((resolve, reject) => {
          updatePostMutation.mutate(
            {
              id: post.id,
              status: newStatus,
            },
            {
              onSuccess: () => {
                toast.success(`Post ${action}d successfully`);
                resolve();
              },
              onError: (error) => {
                toast.error(`Failed to ${action} post`);
                reject(error);
              },
            }
          );
        });
      } else if (action === "review") {
        return new Promise<void>((resolve, reject) => {
          updatePostMutation.mutate(
            {
              id: post.id,
              status: "needs_review",
            },
            {
              onSuccess: () => {
                toast.success("Post moved back to review");
                resolve();
              },
              onError: (error) => {
                toast.error("Failed to move post to review");
                reject(error);
              },
            }
          );
        });
      }
    });
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedPosts.length === 0) return;

    // Handle bulk schedule separately
    if (action === "schedule") {
      setShowBulkScheduleModal(true);
      return;
    }

    // Check if bulk action requires confirmation
    const destructiveBulkActions = ["reject", "archive"];
    if (destructiveBulkActions.includes(action)) {
      const count = selectedPosts.length;
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

    bulkUpdateMutation.mutate(
      {
        action,
        postIds: selectedPosts,
      },
      {
        onSuccess: () => {
          const count = selectedPosts.length;
          toast.success(`Successfully ${action}d ${count} posts`);
          setSelectedPosts([]);
        },
        onError: () => {
          toast.error(`Failed to ${action} selected posts`);
        },
      }
    );
  };

  // Selection handlers
  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedPosts((prev) => [...prev, id]);
    } else {
      setSelectedPosts((prev) =>
        prev.filter((selectedId) => selectedId !== id)
      );
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPosts(posts.map((p) => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  // Smart selection handlers
  const handleSelectFiltered = () => {
    setSelectedPosts(filteredPosts.map((p) => p.id));
  };

  const handleSelectByStatus = (status: string) => {
    const statusPosts = posts.filter((p) => p.status === status);
    setSelectedPosts(statusPosts.map((p) => p.id));
  };

  const handleSelectByPlatform = (platform: string) => {
    const platformPosts = posts.filter((p) => p.platform === platform);
    setSelectedPosts(platformPosts.map((p) => p.id));
  };

  const handleInvertSelection = () => {
    const currentSelected = new Set(selectedPosts);
    const inverted = posts
      .filter((p) => !currentSelected.has(p.id))
      .map((p) => p.id);
    setSelectedPosts(inverted);
  };

  const handleSelectDateRange = (start: Date, end: Date) => {
    const rangePosts = posts.filter((p) => {
      const postDate = new Date(p.createdAt);
      return postDate >= start && postDate <= end;
    });
    setSelectedPosts(rangePosts.map((p) => p.id));
  };

  // Handle modal save
  const handleModalSave = async (updatedData: Partial<PostView>) => {
    if (!selectedPost) {
      throw new Error("No post selected for saving");
    }

    updatePostMutation.mutate(
      {
        id: selectedPost.id,
        ...updatedData,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setSelectedPost(null);
        },
        onError: (error) => {
          throw error; // Re-throw to let PostModal handle the error display
        },
      }
    );
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
        updatePostMutation.mutate({
          id: postId,
          status: "scheduled",
        });

        setShowScheduleModal(false);
        setPostToSchedule(null);
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
            updatePostMutation.mutate({
              id: postId,
              status: "scheduled",
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
      setSelectedPosts([]);
      setShowBulkScheduleModal(false);
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
      {/* Action Bar */}
      <PostsActionBar
        selectedPosts={selectedPosts}
        searchQuery={searchQuery}
        showFilters={showFilters}
        onBulkAction={handleBulkAction}
        onSearchChange={setSearchQuery}
        onToggleFilters={() => setShowFilters(!showFilters)}
      >
        <SmartSelection
          totalItems={posts.length}
          selectedCount={selectedPosts.length}
          filteredCount={filteredPosts.length}
          onSelectAll={handleSelectAll}
          onSelectFiltered={handleSelectFiltered}
          onSelectByStatus={handleSelectByStatus}
          onSelectByPlatform={handleSelectByPlatform}
          onInvertSelection={handleInvertSelection}
          onSelectDateRange={handleSelectDateRange}
          statuses={[
            "needs_review",
            "approved",
            "rejected",
            "scheduled",
            "published",
          ]}
          platforms={["x", "linkedin"]}
        />
      </PostsActionBar>

      {/* Advanced Filters */}
      {showFilters && (
        <PostsFilters
          platformFilter={platformFilter}
          sortBy={sortBy}
          onPlatformChange={setPlatformFilter}
          onSortChange={setSortBy}
          onClearFilters={() => {
            setSearchQuery("");
            setPlatformFilter("all");
            setSortBy("createdAt-desc");
          }}
        />
      )}

      {/* Status Tabs */}
      <PostsStatusTabs
        activeFilter={activeStatusFilter}
        posts={posts}
        onFilterChange={setActiveStatusFilter}
      />

      {/* Posts Content */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <Edit3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || platformFilter !== "all"
              ? "No matching posts found"
              : activeStatusFilter === "needs_review"
              ? "No posts need review"
              : `No ${
                  activeStatusFilter === "all" ? "" : activeStatusFilter
                } posts found`}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || platformFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : activeStatusFilter === "needs_review"
              ? "All posts have been reviewed. Great work!"
              : "Generate posts from approved insights, or check other status tabs"}
          </p>
          {(searchQuery || platformFilter !== "all") && (
            <Button
              onClick={() => {
                setSearchQuery("");
                setPlatformFilter("all");
              }}
              variant="default"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <PostsDataTable
          posts={filteredPosts}
          selectedPosts={selectedPosts}
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

      {/* Modals */}
      <PostModal
        post={selectedPost}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedPost(null);
        }}
        onSave={handleModalSave}
      />

      <SchedulePostModal
        post={postToSchedule}
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setPostToSchedule(null);
        }}
        onSchedule={handleSchedulePost}
      />

      <ConfirmationDialog {...confirmationProps} />

      <BulkScheduleModal
        posts={posts.filter((p) => selectedPosts.includes(p.id))}
        isOpen={showBulkScheduleModal}
        onClose={() => setShowBulkScheduleModal(false)}
        onSchedule={handleBulkSchedule}
      />
    </div>
  );
}