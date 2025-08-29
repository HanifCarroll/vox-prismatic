import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import type { ContentView, ContentItem, OptimisticContentItem } from "../components/views/config";
import type { WorkflowEvent, JobEvent } from "@/lib/sse-client";
import { useWorkflowSSE } from "@/hooks/useWorkflowSSE";
import { QueueJobStatus, JobType } from "@content-creation/types";
import { useOptimisticUpdate } from "@/hooks/useOptimisticUpdate";
import { EntityType } from "@content-creation/types";

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

// Workflow job types enum
enum WorkflowJobType {
  CLEAN_TRANSCRIPT = 'clean_transcript',
  GENERATE_INSIGHTS = 'generate_insights',
  GENERATE_POSTS = 'generate_posts'
}

// Track active workflow jobs
interface ActiveJob {
  id: string;
  jobId: string;
  type: WorkflowJobType;
  entityId: string;
  entityType: ContentView;
  title: string;
  progress: number;
  status: QueueJobStatus;
  startTime: Date;
  error?: string;
}

export function useContentActions(view: ContentView) {
  const router = useRouter();
  const toast = useToast();
  const { executeWithOptimism, executeBatchWithOptimism } = useOptimisticUpdate();
  
  // Track active workflow jobs
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  
  // Handle workflow events
  const handleWorkflowEvent = useCallback((event: WorkflowEvent) => {
    // We only care about job events for now
    if (!('jobId' in event)) return;
    const jobEvent = event as JobEvent;
    setActiveJobs(prev => {
      return prev.map(job => {
        if (job.jobId === jobEvent.jobId) {
          const updatedJob = { ...job };
          
          switch (jobEvent.type) {
            case 'job.started':
              updatedJob.status = QueueJobStatus.ACTIVE;
              updatedJob.progress = 0;
              break;
            case 'job.progress':
              updatedJob.progress = jobEvent.data.progress || 0;
              break;
            case 'job.completed':
              updatedJob.status = QueueJobStatus.COMPLETED;
              updatedJob.progress = 100;
              // Show success toast
              toast.success(getJobCompletionMessage(job.type));
              // Auto-remove after delay
              setTimeout(() => {
                setActiveJobs(prev => prev.filter(j => j.jobId !== jobEvent.jobId));
                router.refresh();
              }, 2000);
              break;
            case 'job.failed':
              updatedJob.status = QueueJobStatus.FAILED;
              updatedJob.error = jobEvent.data.error?.message || 'Job failed';
              toast.error(`${getJobTitle(job.type)} failed: ${updatedJob.error}`);
              break;
          }
          
          return updatedJob;
        }
        return job;
      });
    });
  }, [toast, router]);

  // SSE connection for workflow events
  const { isConnected } = useWorkflowSSE(handleWorkflowEvent, true);
  
  // Helper functions
  const getJobTitle = (type: WorkflowJobType) => {
    switch (type) {
      case WorkflowJobType.CLEAN_TRANSCRIPT: 
        return 'Transcript Cleaning';
      case WorkflowJobType.GENERATE_INSIGHTS: 
        return 'Insight Generation';
      case WorkflowJobType.GENERATE_POSTS: 
        return 'Post Generation';
      default: 
        return 'Processing';
    }
  };
  
  const getJobCompletionMessage = (type: WorkflowJobType) => {
    switch (type) {
      case WorkflowJobType.CLEAN_TRANSCRIPT: 
        return 'Transcript cleaned successfully';
      case WorkflowJobType.GENERATE_INSIGHTS: 
        return 'Insights generated successfully';
      case WorkflowJobType.GENERATE_POSTS: 
        return 'Posts generated successfully';
      default: 
        return 'Processing completed';
    }
  };
  
  const addActiveJob = useCallback((jobId: string, type: WorkflowJobType, entityId: string, title: string) => {
    const activeJob: ActiveJob = {
      id: `${entityId}-${type}`,
      jobId,
      type,
      entityId,
      entityType: view,
      title,
      progress: 0,
      status: QueueJobStatus.WAITING,
      startTime: new Date(),
    };
    
    setActiveJobs(prev => {
      // Remove any existing job for same entity+type, then add new one
      const filtered = prev.filter(job => job.id !== activeJob.id);
      return [...filtered, activeJob];
    });
  }, [view]);
  
  const removeActiveJob = useCallback((jobId: string) => {
    setActiveJobs(prev => prev.filter(job => job.jobId !== jobId));
  }, []);
  
  // Helper to get entity type from view
  const getEntityType = (view: ContentView): EntityType => {
    switch (view) {
      case 'transcripts': return EntityType.TRANSCRIPT;
      case 'insights': return EntityType.INSIGHT;
      case 'posts': return EntityType.POST;
      default: return EntityType.POST;
    }
  };
  
  // Single item action handler with optimistic updates
  const handleAction = useCallback(async (action: string, item: ContentItem) => {
    const entityType = getEntityType(view);
    
    try {
      let result: { success: boolean; data?: any; error?: Error } | undefined;
      
      switch (view) {
        case 'transcripts':
          switch (action) {
            case 'view':
              // This is handled by onItemClick
              return;
            case 'clean':
              result = await cleanTranscript(item.id);
              if (result.success) {
                // For workflow jobs, track progress instead of showing immediate toast
                if (result.data?.type === 'workflow_job' && result.data?.jobId) {
                  addActiveJob(result.data.jobId, WorkflowJobType.CLEAN_TRANSCRIPT, item.id, item.title || 'Untitled');
                  toast.success('Transcript cleaning started');
                } else {
                  toast.success('Transcript cleaned successfully');
                }
              }
              break;
            case 'generateInsights':
              result = await generateInsightsFromTranscript(item.id);
              if (result.success) {
                // For workflow jobs, track progress instead of showing immediate toast
                if (result.data?.type === 'workflow_job' && result.data?.jobId) {
                  addActiveJob(result.data.jobId, WorkflowJobType.GENERATE_INSIGHTS, item.id, item.title || 'Untitled');
                  toast.success('Insight generation started');
                } else {
                  toast.success('Insights generation started');
                }
              }
              break;
            case 'delete':
              await executeWithOptimism({
                entityType: EntityType.TRANSCRIPT,
                entityId: item.id,
                action: 'delete',
                optimisticData: { ...item, _deleted: true },
                originalData: item,
                serverAction: () => deleteTranscript(item.id),
                successMessage: 'Transcript deleted',
                errorMessage: 'Failed to delete transcript',
              });
              return; // executeWithOptimism handles everything
          }
          break;
          
        case 'insights':
          switch (action) {
            case 'view':
              return;
            case 'approve':
              await executeWithOptimism({
                entityType: EntityType.INSIGHT,
                entityId: item.id,
                action: 'approve',
                optimisticData: { ...item, status: 'approved' },
                originalData: item,
                serverAction: () => approveInsight(item.id),
                successMessage: 'Insight approved',
                errorMessage: 'Failed to approve insight',
              });
              return; // executeWithOptimism handles everything
            case 'reject':
              await executeWithOptimism({
                entityType: EntityType.INSIGHT,
                entityId: item.id,
                action: 'reject',
                optimisticData: { ...item, status: 'rejected' },
                originalData: item,
                serverAction: () => rejectInsight(item.id),
                successMessage: 'Insight rejected',
                errorMessage: 'Failed to reject insight',
              });
              return; // executeWithOptimism handles everything
            case 'generatePosts':
              result = await generatePostsFromInsight(item.id);
              if (result.success) {
                // For workflow jobs, track progress instead of showing immediate toast
                if (result.data?.type === 'workflow_job' && result.data?.jobId) {
                  addActiveJob(result.data.jobId, WorkflowJobType.GENERATE_POSTS, item.id, item.title || 'Untitled');
                  toast.success('Post generation started');
                } else {
                  toast.success('Post generation started');
                }
              }
              break;
            case 'delete':
              await executeWithOptimism({
                entityType: EntityType.INSIGHT,
                entityId: item.id,
                action: 'delete',
                optimisticData: { ...item, _deleted: true },
                originalData: item,
                serverAction: () => deleteInsight(item.id),
                successMessage: 'Insight deleted',
                errorMessage: 'Failed to delete insight',
              });
              return; // executeWithOptimism handles everything
          }
          break;
          
        case 'posts':
          switch (action) {
            case 'view':
              return;
            case 'approve':
              await executeWithOptimism({
                entityType: EntityType.POST,
                entityId: item.id,
                action: 'approve',
                optimisticData: { ...item, status: 'approved' },
                originalData: item,
                serverAction: () => approvePost(item.id),
                successMessage: 'Post approved',
                errorMessage: 'Failed to approve post',
              });
              return; // executeWithOptimism handles everything
            case 'schedule':
              // This opens a modal, handled differently
              return;
            case 'publish':
              // For now, publishing updates status to published
              result = await bulkUpdatePosts('publish', [item.id]);
              if (result.success) {
                toast.success('Post published');
              }
              break;
            case 'delete':
              await executeWithOptimism({
                entityType: EntityType.POST,
                entityId: item.id,
                action: 'delete',
                optimisticData: { ...item, _deleted: true },
                originalData: item,
                serverAction: () => deletePost(item.id),
                successMessage: 'Post deleted',
                errorMessage: 'Failed to delete post',
              });
              return; // executeWithOptimism handles everything
          }
          break;
      }
      
      if (result && !result.success) {
        toast.error(result.error?.message || `Failed to ${action}`);
      } else if (result) {
        router.refresh();
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    }
  }, [view, router, toast]);
  
  // Bulk action handler with optimistic updates
  const handleBulkAction = useCallback(async (action: string, itemIds: string[], items?: ContentItem[]) => {
    if (!itemIds.length) return;
    
    const entityType = getEntityType(view);
    
    try {
      let result: { success: boolean; data?: { processedCount?: number } | null; error?: Error } | undefined;
      
      switch (view) {
        case 'transcripts':
          switch (action) {
            case 'bulkDelete':
              // If we have the items, use optimistic updates
              if (items && items.length === itemIds.length) {
                const updates = items.map((item, index) => ({
                  entityType: EntityType.TRANSCRIPT,
                  entityId: itemIds[index],
                  action: 'delete',
                  optimisticData: { ...item, _deleted: true },
                  originalData: item,
                  serverAction: () => deleteTranscript(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} transcripts deleted`);
              } else {
                // Fallback to non-optimistic
                for (const id of itemIds) {
                  await deleteTranscript(id);
                }
                toast.success(`${itemIds.length} transcripts deleted`);
              }
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
              if (items && items.length === itemIds.length) {
                const updates = items.map((item, index) => ({
                  entityType: EntityType.INSIGHT,
                  entityId: itemIds[index],
                  action: 'approve',
                  optimisticData: { ...item, status: 'approved' },
                  originalData: item,
                  serverAction: () => approveInsight(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} insights approved`);
              } else {
                for (const id of itemIds) {
                  await approveInsight(id);
                }
                toast.success(`${itemIds.length} insights approved`);
              }
              break;
            case 'bulkReject':
              if (items && items.length === itemIds.length) {
                const updates = items.map((item, index) => ({
                  entityType: EntityType.INSIGHT,
                  entityId: itemIds[index],
                  action: 'reject',
                  optimisticData: { ...item, status: 'rejected' },
                  originalData: item,
                  serverAction: () => rejectInsight(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} insights rejected`);
              } else {
                for (const id of itemIds) {
                  await rejectInsight(id);
                }
                toast.success(`${itemIds.length} insights rejected`);
              }
              break;
            case 'bulkDelete':
              if (items && items.length === itemIds.length) {
                const updates = items.map((item, index) => ({
                  entityType: EntityType.INSIGHT,
                  entityId: itemIds[index],
                  action: 'delete',
                  optimisticData: { ...item, _deleted: true },
                  originalData: item,
                  serverAction: () => deleteInsight(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} insights deleted`);
              } else {
                for (const id of itemIds) {
                  await deleteInsight(id);
                }
                toast.success(`${itemIds.length} insights deleted`);
              }
              break;
          }
          break;
          
        case 'posts':
          switch (action) {
            case 'bulkApprove':
              if (items && items.length === itemIds.length) {
                const updates = items.map((item, index) => ({
                  entityType: EntityType.POST,
                  entityId: itemIds[index],
                  action: 'approve',
                  optimisticData: { ...item, status: 'approved' },
                  originalData: item,
                  serverAction: () => approvePost(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} posts approved`);
              } else {
                for (const id of itemIds) {
                  await approvePost(id);
                }
                toast.success(`${itemIds.length} posts approved`);
              }
              break;
            case 'bulkSchedule':
              // This opens a modal, handled differently
              return;
            case 'bulkDelete':
              if (items && items.length === itemIds.length) {
                const updates = items.map((item, index) => ({
                  entityType: EntityType.POST,
                  entityId: itemIds[index],
                  action: 'delete',
                  optimisticData: { ...item, _deleted: true },
                  originalData: item,
                  serverAction: () => deletePost(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} posts deleted`);
              } else {
                for (const id of itemIds) {
                  await deletePost(id);
                }
                toast.success(`${itemIds.length} posts deleted`);
              }
              break;
          }
          break;
      }
      
      if (result && !result.success) {
        toast.error(result.error?.message || `Failed to ${action}`);
      } else if (result) {
        router.refresh();
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    }
  }, [view, router, toast]);
  
  return {
    handleAction,
    handleBulkAction,
    activeJobs,
    removeActiveJob,
    isConnected
  };
}