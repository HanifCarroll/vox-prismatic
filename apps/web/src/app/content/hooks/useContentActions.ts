import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import type { ContentView, ContentItem } from "../components/views/config";

// Import all server actions
import { 
  deleteTranscript,
  bulkUpdateTranscripts,
  cleanTranscript,
  generateInsightsFromTranscript 
} from "@/app/actions/transcripts";

import { 
  deleteInsight,
  bulkUpdateInsights,
  approveInsight,
  rejectInsight,
  generatePostsFromInsight
} from "@/app/actions/insights";

import { 
  deletePost,
  bulkUpdatePosts,
  approvePost,
  schedulePost
} from "@/app/actions/posts";

export function useContentActions(view: ContentView) {
  const router = useRouter();
  const toast = useToast();
  
  // Single item action handler
  const handleAction = useCallback(async (action: string, item: ContentItem) => {
    try {
      let result: any;
      
      switch (view) {
        case 'transcripts':
          switch (action) {
            case 'view':
              // This is handled by onItemClick
              return;
            case 'clean':
              result = await cleanTranscript(item.id);
              if (result.success) {
                toast.success('Transcript cleaned successfully');
              }
              break;
            case 'generateInsights':
              result = await generateInsightsFromTranscript(item.id);
              if (result.success) {
                toast.success('Insights generation started');
              }
              break;
            case 'delete':
              result = await deleteTranscript(item.id);
              if (result.success) {
                toast.success('Transcript deleted');
              }
              break;
          }
          break;
          
        case 'insights':
          switch (action) {
            case 'view':
              return;
            case 'approve':
              result = await approveInsight(item.id);
              if (result.success) {
                toast.success('Insight approved');
              }
              break;
            case 'reject':
              result = await rejectInsight(item.id);
              if (result.success) {
                toast.success('Insight rejected');
              }
              break;
            case 'generatePosts':
              result = await generatePostsFromInsight(item.id);
              if (result.success) {
                toast.success('Post generation started');
              }
              break;
            case 'delete':
              result = await deleteInsight(item.id);
              if (result.success) {
                toast.success('Insight deleted');
              }
              break;
          }
          break;
          
        case 'posts':
          switch (action) {
            case 'view':
              return;
            case 'approve':
              result = await approvePost(item.id);
              if (result.success) {
                toast.success('Post approved');
              }
              break;
            case 'schedule':
              // This opens a modal, handled differently
              return;
            case 'publish':
              // For now, publishing updates status to published
              result = await bulkUpdatePosts([item.id], { status: 'published' });
              if (result.success) {
                toast.success('Post published');
              }
              break;
            case 'delete':
              result = await deletePost(item.id);
              if (result.success) {
                toast.success('Post deleted');
              }
              break;
          }
          break;
      }
      
      if (result && !result.success) {
        toast.error(result.error || `Failed to ${action}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    }
  }, [view, router, toast]);
  
  // Bulk action handler
  const handleBulkAction = useCallback(async (action: string, itemIds: string[]) => {
    if (!itemIds.length) return;
    
    try {
      let result: any;
      
      switch (view) {
        case 'transcripts':
          switch (action) {
            case 'bulkDelete':
              // Delete each transcript individually
              for (const id of itemIds) {
                await deleteTranscript(id);
              }
              toast.success(`${itemIds.length} transcripts deleted`);
              break;
            case 'bulkClean':
              // Process each transcript
              for (const id of itemIds) {
                await cleanTranscript(id);
              }
              toast.success(`${itemIds.length} transcripts queued for cleaning`);
              break;
          }
          break;
          
        case 'insights':
          switch (action) {
            case 'bulkApprove':
              // Approve each insight individually
              for (const id of itemIds) {
                await approveInsight(id);
              }
              toast.success(`${itemIds.length} insights approved`);
              break;
            case 'bulkReject':
              // Reject each insight individually
              for (const id of itemIds) {
                await rejectInsight(id);
              }
              toast.success(`${itemIds.length} insights rejected`);
              break;
            case 'bulkDelete':
              // Delete each insight individually
              for (const id of itemIds) {
                await deleteInsight(id);
              }
              toast.success(`${itemIds.length} insights deleted`);
              break;
          }
          break;
          
        case 'posts':
          switch (action) {
            case 'bulkApprove':
              // Approve each post individually
              for (const id of itemIds) {
                await approvePost(id);
              }
              toast.success(`${itemIds.length} posts approved`);
              break;
            case 'bulkSchedule':
              // This opens a modal, handled differently
              return;
            case 'bulkDelete':
              // Delete each post individually
              for (const id of itemIds) {
                await deletePost(id);
              }
              toast.success(`${itemIds.length} posts deleted`);
              break;
          }
          break;
      }
      
      if (result && !result.success) {
        toast.error(result.error || `Failed to ${action}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    }
  }, [view, router, toast]);
  
  return {
    handleAction,
    handleBulkAction
  };
}