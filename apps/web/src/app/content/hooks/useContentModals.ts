import { useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import type { TranscriptView, InsightView, PostView } from "@/types";
import { 
  useCreateTranscriptAction, 
  useUpdateTranscriptAction 
} from "./use-server-actions";
import { useUpdateInsightAction } from "./use-server-actions";
import { useUpdatePostAction } from "./use-server-actions";

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
  const createTranscriptAction = useCreateTranscriptAction();
  const updateTranscriptAction = useUpdateTranscriptAction();
  const updateInsightAction = useUpdateInsightAction();
  const updatePostAction = useUpdatePostAction();

  const handleInputTranscript = useCallback(async (formData: {
    title: string;
    content: string;
    fileName?: string;
  }) => {
    try {
      await createTranscriptAction({
        title: formData.title,
        rawContent: formData.content,
        sourceType: formData.fileName ? "upload" : "manual",
        fileName: formData.fileName,
        metadata: formData.fileName ? { originalFileName: formData.fileName } : undefined,
      });
      dispatch({ type: 'HIDE_TRANSCRIPT_INPUT_MODAL' });
      toast.success('Transcript created');
    } catch (error) {
      toast.error('Failed to create transcript');
    }
  }, [createTranscriptAction, toast, dispatch]);

  const handleSaveTranscript = useCallback(async (updatedTranscript: TranscriptView) => {
    try {
      await updateTranscriptAction(updatedTranscript.id, {
        title: updatedTranscript.title,
        rawContent: updatedTranscript.rawContent,
        cleanedContent: updatedTranscript.cleanedContent,
      });
      dispatch({ type: 'HIDE_TRANSCRIPT_MODAL' });
      toast.success('Transcript updated');
    } catch (error) {
      toast.error('Failed to update transcript');
    }
  }, [updateTranscriptAction, toast, dispatch]);

  const handleSaveInsight = useCallback(async (updatedData: Partial<InsightView>) => {
    if (!modals.selectedInsight) return;

    try {
      const insightId = modals.selectedInsight.id;
      await updateInsightAction(insightId, updatedData);
      dispatch({ type: 'HIDE_INSIGHT_MODAL' });
      toast.success('Insight updated');
    } catch (error) {
      toast.error('Failed to update insight');
    }
  }, [updateInsightAction, toast, dispatch, modals.selectedInsight]);

  const handleSavePost = useCallback(async (updatedData: Partial<PostView>) => {
    if (!modals.selectedPost) {
      throw new Error("No post selected for saving");
    }

    try {
      await updatePostAction(modals.selectedPost.id, updatedData);
      dispatch({ type: 'HIDE_POST_MODAL' });
      toast.success('Post updated');
    } catch (error) {
      throw error;
    }
  }, [updatePostAction, toast, dispatch, modals.selectedPost]);

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

        await updatePostAction(postId, {
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
  }, [toast, updatePostAction, dispatch]);

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
            await updatePostAction(postId, {
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
  }, [toast, updatePostAction, dispatch]);

  return {
    handleInputTranscript,
    handleSaveTranscript,
    handleSaveInsight,
    handleSavePost,
    handleSchedulePost,
    handleBulkSchedule,
  };
}