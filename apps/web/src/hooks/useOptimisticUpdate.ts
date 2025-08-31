import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast';
import { 
  useOptimisticStore, 
  type OptimisticUpdate,
  UpdateStatus
} from '@/lib/optimistic-store';
import { EntityType } from '@content-creation/types';

/**
 * Hook for managing optimistic updates with automatic rollback on failure
 * 
 * Usage:
 * const { executeWithOptimism } = useOptimisticUpdate();
 * 
 * await executeWithOptimism({
 *   entityType: 'post',
 *   entityId: postId,
 *   action: 'approve',
 *   optimisticData: { ...post, status: 'approved' },
 *   serverAction: () => approvePost(postId),
 *   successMessage: 'Post approved',
 *   errorMessage: 'Failed to approve post',
 * });
 */

interface OptimisticExecutionOptions<T = any, O = T> {
  entityType: EntityType;
  entityId: string;
  action: string;
  optimisticData: O; // Can be extended type with additional properties
  originalData: T;
  serverAction: () => Promise<{ success: boolean; error?: Error; data?: any }>;
  successMessage?: string;
  errorMessage?: string;
  skipRefresh?: boolean; // Skip query invalidation on success
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  rollbackDelay?: number; // Delay before rollback animation (ms)
}

export function useOptimisticUpdate() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { 
    addOptimisticUpdate, 
    resolveUpdate, 
    rollbackUpdate,
    clearUpdate 
  } = useOptimisticStore();
  
  const executeWithOptimism = useCallback(async <T, O = T>(
    options: OptimisticExecutionOptions<T, O>
  ) => {
    const {
      entityType,
      entityId,
      action,
      optimisticData,
      originalData,
      serverAction,
      successMessage,
      errorMessage,
      skipRefresh = false,
      onSuccess,
      onError,
      rollbackDelay = 500,
    } = options;
    
    // Step 1: Apply optimistic update immediately
    const updateId = addOptimisticUpdate({
      entityType,
      entityId,
      action,
      optimisticData,
      originalData,
    });
    
    try {
      // Step 2: Execute server action in background
      const result = await serverAction();
      
      if (result.success) {
        // Step 3a: Mark update as successful
        resolveUpdate(updateId, true);
        
        // Show success message if provided
        if (successMessage) {
          toast.success(successMessage);
        }
        
        // Invalidate queries to sync with server state
        if (!skipRefresh) {
          // Invalidate all queries for this entity type to ensure fresh data
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              // Invalidate queries that might contain this entity
              const queryKey = query.queryKey;
              if (Array.isArray(queryKey) && queryKey.length > 0) {
                const [namespace] = queryKey;
                // Invalidate queries based on entity type
                switch (entityType) {
                  case EntityType.TRANSCRIPT:
                    return namespace === 'transcripts';
                  case EntityType.INSIGHT:
                    return namespace === 'insights';
                  case EntityType.POST:
                    return namespace === 'posts';
                  case EntityType.SCHEDULED_POST:
                    return namespace === 'scheduler';
                  default:
                    return false;
                }
              }
              return false;
            }
          });
        }
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result.data);
        }
        
        return { success: true, data: result.data };
      } else {
        // Step 3b: Server returned an error
        const errorMsg = result.error?.message || errorMessage || `Failed to ${action}`;
        
        // Wait a bit to show the optimistic state, then rollback
        setTimeout(() => {
          rollbackUpdate(updateId);
        }, rollbackDelay);
        
        // Show error message
        toast.error(errorMsg);
        
        // Mark update as failed
        resolveUpdate(updateId, false, errorMsg);
        
        // Call error callback if provided
        if (onError) {
          onError(errorMsg);
        }
        
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      // Step 3c: Network or unexpected error
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Rollback immediately on network errors
      rollbackUpdate(updateId);
      
      // Show error message
      toast.error(errorMessage || errorMsg);
      
      // Mark update as failed
      resolveUpdate(updateId, false, errorMsg);
      
      // Call error callback if provided
      if (onError) {
        onError(errorMsg);
      }
      
      return { success: false, error: errorMsg };
    }
  }, [addOptimisticUpdate, resolveUpdate, rollbackUpdate, queryClient, toast]);
  
  // Execute multiple optimistic updates in parallel
  const executeBatchWithOptimism = useCallback(async <T, O = T>(
    updates: OptimisticExecutionOptions<T, O>[]
  ) => {
    const results = await Promise.allSettled(
      updates.map(update => executeWithOptimism(update))
    );
    
    const succeeded = results.filter(
      (r): r is PromiseFulfilledResult<{ success: true; data: any }> => 
        r.status === 'fulfilled' && r.value.success
    );
    
    const failed = results.filter(
      (r): r is PromiseFulfilledResult<{ success: false; error: string }> | PromiseRejectedResult => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    );
    
    return {
      succeeded: succeeded.length,
      failed: failed.length,
      total: results.length,
      results,
    };
  }, [executeWithOptimism]);
  
  return {
    executeWithOptimism,
    executeBatchWithOptimism,
  };
}

/**
 * Hook to check if an entity has pending optimistic updates
 * Useful for showing loading states on specific items
 */
export function useIsOptimistic(entityType: EntityType, entityId: string) {
  const hasUpdate = useOptimisticStore(
    (state) => state.hasOptimisticUpdate(entityType, entityId)
  );
  
  return hasUpdate;
}

/**
 * Hook to get optimistic data for an entity
 * Returns the optimistic data if available, otherwise null
 */
export function useOptimisticData<T>(entityType: EntityType, entityId: string) {
  const optimisticData = useOptimisticStore(
    (state) => state.getOptimisticData<T>(entityType, entityId)
  );
  
  return optimisticData;
}

/**
 * Hook to merge server data with optimistic updates
 * Use this when displaying lists of data
 */
export function useMergedOptimisticData<T extends { id: string }>(
  serverData: T[],
  entityType: EntityType
): T[] {
  const updates = useOptimisticStore((state) => state.updates);
  
  // Handle undefined or null serverData
  if (!serverData) {
    return [];
  }
  
  // Re-compute merged data when updates change
  return serverData.map((item) => {
    // Find any pending updates for this item
    const itemUpdates = Array.from(updates.values()).filter(
      (u) => u.entityType === entityType && u.entityId === item.id && u.status === UpdateStatus.PENDING
    );
    
    if (itemUpdates.length > 0) {
      // Get the most recent optimistic update
      const latestUpdate = itemUpdates.sort((a, b) => b.timestamp - a.timestamp)[0];
      
      // Merge optimistic data with server data
      // We know optimisticData extends T since it was created from a T item
      return { ...item, ...(latestUpdate.optimisticData as Partial<T>) };
    }
    
    return item;
  });
}