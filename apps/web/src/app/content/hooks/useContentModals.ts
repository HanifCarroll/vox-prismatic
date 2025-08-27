import { useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { TranscriptView, InsightView, PostView } from "@/types";
import { 
  useCreateTranscript, 
  useUpdateTranscript 
} from "./useTranscriptQueries";
import { useUpdateInsight } from "./useInsightQueries";
import { useUpdatePost } from "./usePostQueries";

interface ModalState {
  showTranscriptInput: boolean;
  showTranscriptModal: boolean;
  selectedTranscript: TranscriptView | null;
  transcriptModalMode: "view" | "edit";
  showInsightModal: boolean;
  selectedInsight: InsightView | null;
  showPostModal: boolean;
  selectedPost: PostView | null;
  showScheduleModal: boolean;
  postToSchedule: PostView | null;
  showBulkScheduleModal: boolean;
}

interface UseContentModalsProps {
  dispatch: (action: any) => void;
  modals: ModalState;
}

export function useContentModals({ dispatch, modals }: UseContentModalsProps) {
  const toast = useToast();
  const createTranscriptMutation = useCreateTranscript();
  const updateTranscriptMutation = useUpdateTranscript();
  const updateInsightMutation = useUpdateInsight();
  const updatePostMutation = useUpdatePost();

  const handleInputTranscript = useCallback((formData: {
    title: string;
    content: string;
    fileName?: string;
  }) => {
    createTranscriptMutation.mutate({
      title: formData.title,
      rawContent: formData.content,
      sourceType: formData.fileName ? "upload" : "manual",
      fileName: formData.fileName,
      metadata: formData.fileName ? { originalFileName: formData.fileName } : undefined,
    }, {
      onSuccess: () => {
        dispatch({ type: 'HIDE_TRANSCRIPT_INPUT_MODAL' });
        toast.success('Transcript created');
      }
    });
  }, [createTranscriptMutation, toast, dispatch]);

  const handleSaveTranscript = useCallback((updatedTranscript: TranscriptView) => {
    updateTranscriptMutation.mutate({
      id: updatedTranscript.id,
      title: updatedTranscript.title,
      rawContent: updatedTranscript.rawContent,
      cleanedContent: updatedTranscript.cleanedContent,
    }, {
      onSuccess: () => {
        dispatch({ type: 'HIDE_TRANSCRIPT_MODAL' });
        toast.success('Transcript updated');
      }
    });
  }, [updateTranscriptMutation, toast, dispatch]);

  const handleSaveInsight = useCallback(async (updatedData: Partial<InsightView>) => {
    if (!modals.selectedInsight) return;

    return new Promise<void>((resolve) => {
      const insightId = modals.selectedInsight!.id;
      updateInsightMutation.mutate({
        id: insightId,
        ...updatedData,
      }, {
        onSuccess: () => {
          dispatch({ type: 'HIDE_INSIGHT_MODAL' });
          toast.success('Insight updated');
          resolve();
        },
        onError: () => {
          resolve();
        }
      });
    });
  }, [updateInsightMutation, toast, dispatch, modals.selectedInsight]);

  const handleSavePost = useCallback(async (updatedData: Partial<PostView>) => {
    if (!modals.selectedPost) {
      throw new Error("No post selected for saving");
    }

    updatePostMutation.mutate({
      id: modals.selectedPost.id,
      ...updatedData,
    }, {
      onSuccess: () => {
        dispatch({ type: 'HIDE_POST_MODAL' });
        toast.success('Post updated');
      },
      onError: (error) => {
        throw error;
      },
    });
  }, [updatePostMutation, toast, dispatch, modals.selectedPost]);

  const handleSchedulePost = useCallback(async (postId: string, scheduledFor: Date) => {
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

        updatePostMutation.mutate({
          id: postId,
          status: "scheduled",
        });

        dispatch({ type: 'HIDE_SCHEDULE_MODAL' });
      } else {
        throw new Error(response.error || "Failed to schedule post");
      }
    } catch (error) {
      toast.error("Failed to schedule post", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, [toast, updatePostMutation, dispatch]);

  const handleBulkSchedule = useCallback(async (
    schedules: Array<{ postId: string; scheduledFor: Date }>,
    clearSelection: () => void
  ) => {
    try {
      const results = await Promise.allSettled(
        schedules.map(async ({ postId, scheduledFor }) => {
          const response = await apiClient.post("/api/posts/schedule", {
            postId,
            scheduledFor: scheduledFor.toISOString(),
          });

          if (response.success) {
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

      clearSelection();
      dispatch({ type: 'HIDE_BULK_SCHEDULE_MODAL' });
    } catch (error) {
      toast.error("Bulk scheduling failed");
      throw error;
    }
  }, [toast, updatePostMutation, dispatch]);

  return {
    handleInputTranscript,
    handleSaveTranscript,
    handleSaveInsight,
    handleSavePost,
    handleSchedulePost,
    handleBulkSchedule,
  };
}