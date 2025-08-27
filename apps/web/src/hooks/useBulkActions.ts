import { useCallback } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/lib/toast';

export interface BulkActionOptions {
  onSuccess?: (action: string, affectedIds: string[]) => void;
  onError?: (action: string, error: Error) => void;
  clearSelection?: () => void;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: any;
  variant?: 'default' | 'destructive' | 'outline';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

/**
 * Generic bulk actions hook for list components
 * Handles bulk operations with mutations, toasts, and selection management
 */
export function useBulkActions<T>(
  bulkMutation: UseMutationResult<any, Error, { action: string; insightIds?: string[]; postIds?: string[]; [key: string]: any }>,
  options: BulkActionOptions = {}
) {
  const toast = useToast();
  
  // Execute bulk action with proper error handling and notifications
  const executeBulkAction = useCallback((
    action: string,
    selectedIds: string[],
    additionalData?: Record<string, any>
  ) => {
    if (selectedIds.length === 0) {
      toast.warning('No items selected', {
        description: 'Please select at least one item to perform this action.'
      });
      return;
    }

    const mutationData = {
      action,
      ...(action.includes('insight') ? { insightIds: selectedIds } : { postIds: selectedIds }),
      ...additionalData,
    };

    bulkMutation.mutate(mutationData, {
      onSuccess: (data) => {
        // Clear selection after successful bulk action
        options.clearSelection?.();
        
        // Show success notification
        const count = selectedIds.length;
        const itemType = action.includes('insight') ? 'insight' : 'post';
        const pluralType = count === 1 ? itemType : `${itemType}s`;
        
        toast.success(`Bulk ${action} completed`, {
          description: `Successfully ${action}ed ${count} ${pluralType}`
        });

        // Call custom success handler
        options.onSuccess?.(action, selectedIds);
      },
      onError: (error) => {
        console.error(`Bulk ${action} failed:`, error);
        
        // Show error notification
        const errorMessage = error.message || 'An unexpected error occurred';
        toast.apiError(`bulk ${action}`, errorMessage);

        // Call custom error handler
        options.onError?.(action, error);
      }
    });
  }, [bulkMutation, toast, options]);

  // Common bulk actions for different item types
  const getCommonActions = useCallback((itemType: 'post' | 'insight'): BulkAction[] => {
    const baseActions: BulkAction[] = [
      { key: 'approve', label: 'Approve Selected', variant: 'default' },
      { key: 'reject', label: 'Reject Selected', variant: 'destructive' },
      { key: 'needs_review', label: 'Mark for Review', variant: 'outline' },
      { key: 'archive', label: 'Archive Selected', variant: 'destructive', requiresConfirmation: true },
    ];

    // Add item-specific actions
    if (itemType === 'post') {
      baseActions.splice(2, 0, { key: 'schedule', label: 'Schedule Selected', variant: 'default' });
    }

    return baseActions;
  }, []);

  // Batch action execution with confirmation handling
  const handleBulkAction = useCallback(async (
    action: string,
    selectedIds: string[],
    requiresConfirmation = false,
    confirmationMessage?: string
  ) => {
    if (requiresConfirmation) {
      const message = confirmationMessage || `Are you sure you want to ${action} ${selectedIds.length} item${selectedIds.length === 1 ? '' : 's'}?`;
      
      // Simple confirmation - in a real app you might want a proper modal
      if (!window.confirm(message)) {
        return;
      }
    }

    executeBulkAction(action, selectedIds);
  }, [executeBulkAction]);

  // Quick action shortcuts
  const approveSelected = useCallback((selectedIds: string[]) => {
    executeBulkAction('approve', selectedIds);
  }, [executeBulkAction]);

  const rejectSelected = useCallback((selectedIds: string[]) => {
    executeBulkAction('reject', selectedIds);
  }, [executeBulkAction]);

  const archiveSelected = useCallback((selectedIds: string[]) => {
    handleBulkAction('archive', selectedIds, true, 'This action cannot be undone.');
  }, [handleBulkAction]);

  const scheduleSelected = useCallback((selectedIds: string[], schedulingData?: any) => {
    executeBulkAction('schedule', selectedIds, schedulingData);
  }, [executeBulkAction]);

  return {
    // Core functionality
    executeBulkAction,
    handleBulkAction,
    
    // Quick actions
    approveSelected,
    rejectSelected,
    archiveSelected,
    scheduleSelected,
    
    // Helpers
    getCommonActions,
    
    // Mutation state
    isLoading: bulkMutation.isPending,
    error: bulkMutation.error,
  };
}