import { useCallback, useState, useEffect } from "react";
import { useToast } from "@/lib/toast";
import type { ContentView, ContentItem, OptimisticContentItem } from "@/components/content/views/config";
import type { WorkflowEvent, JobEvent } from "@/lib/sse-client";
import { useWorkflowSSE } from "@/hooks/useWorkflowSSE";
import { 
  QueueJobStatus, 
  JobType, 
  EntityType,
  ContentView as ContentViewType 
} from "@content-creation/types";
import { useOptimisticUpdate } from "@/hooks/useOptimisticUpdate";
import { useContentQueryInvalidation } from "./useContentQueries";

// Import API namespace instead of server actions
import { api } from "@/lib/api";

// Note: Using JobType from shared types
// JobType.CLEAN_TRANSCRIPT for cleaning
// JobType.EXTRACT_INSIGHTS for insights (note: different name in shared types)
// JobType.GENERATE_POSTS for posts

// Track active workflow jobs
interface ActiveJob {
  id: string;
  jobId: string;
  type: JobType;
  entityId: string;
  entityType: ContentViewType;
  title: string;
  progress: number;
  status: QueueJobStatus;
  startTime: Date;
  error?: string;
}

export function useContentActions(view: ContentView) {
  const toast = useToast();
  const { executeWithOptimism, executeBatchWithOptimism } = useOptimisticUpdate();
  const { invalidateTranscripts, invalidateInsights, invalidatePosts } = useContentQueryInvalidation();
  
  // Track active workflow jobs
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  
  // Helper to invalidate the right queries based on job type
  const invalidateQueriesForJobType = useCallback((jobType: JobType) => {
    switch (jobType) {
      case JobType.CLEAN_TRANSCRIPT:
        invalidateTranscripts();
        break;
      case JobType.EXTRACT_INSIGHTS:
        invalidateInsights();
        break;
      case JobType.GENERATE_POSTS:
        invalidatePosts();
        break;
    }
  }, [invalidateTranscripts, invalidateInsights, invalidatePosts]);
  
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
              // Auto-remove after delay and invalidate queries
              setTimeout(() => {
                setActiveJobs(prev => prev.filter(j => j.jobId !== jobEvent.jobId));
                // Invalidate the appropriate queries instead of router.refresh()
                invalidateQueriesForJobType(job.type);
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
  }, [toast, invalidateQueriesForJobType]);

  // SSE connection for workflow events
  const { isConnected } = useWorkflowSSE(handleWorkflowEvent, true);
  
  // Helper functions
  const getJobTitle = (type: JobType) => {
    switch (type) {
      case JobType.CLEAN_TRANSCRIPT: 
        return 'Transcript Cleaning';
      case JobType.EXTRACT_INSIGHTS: 
        return 'Insight Generation';
      case JobType.GENERATE_POSTS: 
        return 'Post Generation';
      default: 
        return 'Processing';
    }
  };
  
  const getJobCompletionMessage = (type: JobType) => {
    switch (type) {
      case JobType.CLEAN_TRANSCRIPT: 
        return 'Transcript cleaned successfully';
      case JobType.EXTRACT_INSIGHTS: 
        return 'Insights generated successfully';
      case JobType.GENERATE_POSTS: 
        return 'Posts generated successfully';
      default: 
        return 'Processing completed';
    }
  };
  
  const addActiveJob = useCallback((jobId: string, type: JobType, entityId: string, title: string) => {
    const activeJob: ActiveJob = {
      id: `${entityId}-${type}`,
      jobId,
      type,
      entityId,
      entityType: view as ContentViewType,
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
      let result: { success: boolean; data?: any; error?: string } | undefined;
      
      switch (view) {
        case 'transcripts':
          switch (action) {
            case 'view':
              // This is handled by onItemClick
              return;
            case 'clean':
              result = await api.transcripts.cleanTranscript(item.id);
              if (result.success) {
                // For workflow jobs, track progress instead of showing immediate toast
                if (result.data?.type === 'workflow_job' && result.data?.jobId) {
                  addActiveJob(result.data.jobId, JobType.CLEAN_TRANSCRIPT, item.id, item.title || 'Untitled');
                  toast.success('Transcript cleaning started');
                } else {
                  toast.success('Transcript cleaned successfully');
                }
              }
              break;
            case 'generateInsights':
              result = await api.transcripts.generateInsightsFromTranscript(item.id);
              if (result.success) {
                // For workflow jobs, track progress instead of showing immediate toast
                if (result.data?.type === 'workflow_job' && result.data?.jobId) {
                  addActiveJob(result.data.jobId, JobType.EXTRACT_INSIGHTS, item.id, item.title || 'Untitled');
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
                serverAction: () => api.transcripts.deleteTranscript(item.id),
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
                serverAction: () => api.insights.approveInsight(item.id),
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
                serverAction: () => api.insights.rejectInsight(item.id),
                successMessage: 'Insight rejected',
                errorMessage: 'Failed to reject insight',
              });
              return; // executeWithOptimism handles everything
            case 'generatePosts':
              result = await api.insights.generatePostsFromInsight(item.id);
              if (result.success) {
                // For workflow jobs, track progress instead of showing immediate toast
                if (result.data?.type === 'workflow_job' && result.data?.jobId) {
                  addActiveJob(result.data.jobId, JobType.GENERATE_POSTS, item.id, item.title || 'Untitled');
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
                serverAction: () => api.insights.deleteInsight(item.id),
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
                serverAction: () => api.posts.approvePost(item.id),
                successMessage: 'Post approved',
                errorMessage: 'Failed to approve post',
              });
              return; // executeWithOptimism handles everything
            case 'schedule':
              // This opens a modal, handled differently
              return;
            case 'publish':
              // For now, publishing updates status to published
              result = await api.posts.bulkUpdatePosts('publish', [item.id]);
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
                serverAction: () => api.posts.deletePost(item.id),
                successMessage: 'Post deleted',
                errorMessage: 'Failed to delete post',
              });
              return; // executeWithOptimism handles everything
          }
          break;
      }
      
      if (result && !result.success) {
        toast.error(typeof result.error === 'string' ? result.error : `Failed to ${action}`);
      } else if (result) {
        // Invalidate queries based on the entity type
        const entityType = getEntityType(view);
        switch (entityType) {
          case EntityType.TRANSCRIPT:
            invalidateTranscripts();
            break;
          case EntityType.INSIGHT:
            invalidateInsights();
            break;
          case EntityType.POST:
            invalidatePosts();
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    }
  }, [view, toast, invalidateTranscripts, invalidateInsights, invalidatePosts]);
  
  // Bulk action handler with optimistic updates
  const handleBulkAction = useCallback(async (action: string, itemIds: string[], items?: ContentItem[]) => {
    if (!itemIds.length) return;
    
    const entityType = getEntityType(view);
    
    try {
      let result: { success: boolean; data?: { processedCount?: number } | null; error?: string } | undefined;
      
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
                  serverAction: () => api.transcripts.deleteTranscript(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} transcripts deleted`);
              } else {
                // Fallback to non-optimistic
                for (const id of itemIds) {
                  await api.transcripts.deleteTranscript(id);
                }
                toast.success(`${itemIds.length} transcripts deleted`);
              }
              break;
            case 'bulkClean':
              // Process each transcript
              for (const id of itemIds) {
                await api.transcripts.cleanTranscript(id);
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
                  serverAction: () => api.insights.approveInsight(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} insights approved`);
              } else {
                for (const id of itemIds) {
                  await api.insights.approveInsight(id);
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
                  serverAction: () => api.insights.rejectInsight(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} insights rejected`);
              } else {
                for (const id of itemIds) {
                  await api.insights.rejectInsight(id);
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
                  serverAction: () => api.insights.deleteInsight(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} insights deleted`);
              } else {
                for (const id of itemIds) {
                  await api.insights.deleteInsight(id);
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
                  serverAction: () => api.posts.approvePost(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} posts approved`);
              } else {
                for (const id of itemIds) {
                  await api.posts.approvePost(id);
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
                  serverAction: () => api.posts.deletePost(itemIds[index]),
                }));
                
                const results = await executeBatchWithOptimism(updates);
                toast.success(`${results.succeeded} posts deleted`);
              } else {
                for (const id of itemIds) {
                  await api.posts.deletePost(id);
                }
                toast.success(`${itemIds.length} posts deleted`);
              }
              break;
          }
          break;
      }
      
      if (result && !result.success) {
        toast.error(typeof result.error === 'string' ? result.error : `Failed to ${action}`);
      } else if (result) {
        // Invalidate queries based on the entity type
        const entityType = getEntityType(view);
        switch (entityType) {
          case EntityType.TRANSCRIPT:
            invalidateTranscripts();
            break;
          case EntityType.INSIGHT:
            invalidateInsights();
            break;
          case EntityType.POST:
            invalidatePosts();
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    }
  }, [view, toast, invalidateTranscripts, invalidateInsights, invalidatePosts]);
  
  return {
    handleAction,
    handleBulkAction,
    activeJobs,
    removeActiveJob,
    isConnected
  };
}