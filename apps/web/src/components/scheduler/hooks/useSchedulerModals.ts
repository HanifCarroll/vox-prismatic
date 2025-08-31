/**
 * Scheduler-specific modal hooks
 * 
 * Provides type-safe, scheduler-focused modal operations
 * using the global modal store.
 */

import { useCallback } from 'react';
import { useModalStore, modalHelpers } from '@/lib/stores/modal-store';
import { useURLModal } from '@/components/modals/ModalManager';
import { format } from 'date-fns';
import type { Platform } from '@/types';

/**
 * ★ Insight ─────────────────────────────────────
 * Domain-specific hooks provide:
 * - Type safety for scheduler modals
 * - Cleaner component code
 * - Centralized modal logic per feature
 * ─────────────────────────────────────────────────
 */

export function useSchedulerModals() {
  const { openURLModal, closeURLModal } = useURLModal();
  const { openModal, closeModal, updateModalData } = useModalStore();

  // Open schedule post modal (URL-synced for sharing)
  const openScheduleModal = useCallback((params: {
    postId: string;
    platform?: Platform;
    dateTime?: Date;
    content?: string;
  }) => {
    // Only pass mode and postId - everything else comes from the post data
    openURLModal('schedulerPost', {
      mode: 'create' as const,
      postId: params.postId,
    });
  }, [openURLModal]);

  // Open edit scheduled post modal (URL-synced with minimal params)
  const openEditScheduledModal = useCallback((params: {
    eventId: string;
    postId?: string;
    currentDateTime?: Date;
    currentPlatform?: Platform;
  }) => {
    // Only pass eventId and mode - all other data can be derived from the event
    openURLModal('schedulerPost', {
      mode: 'edit' as const,
      eventId: params.eventId,
    });
  }, [openURLModal]);

  // Open reschedule modal (quick action, not URL-synced)
  const openRescheduleModal = useCallback((eventId: string, newDateTime: Date) => {
    // Just pass eventId - the modal will derive everything from the event
    return openModal('schedulerPost', {
      modalState: {
        isOpen: true,
        mode: 'edit' as const,
        eventId,
      }
    });
  }, [openModal]);

  // Delete confirmation (high priority, not URL-synced)
  const openDeleteConfirmation = useCallback((
    eventId: string,
    onConfirm: () => void
  ) => {
    return modalHelpers.openConfirmation({
      isOpen: true,
      title: 'Delete Scheduled Post',
      description: 'Are you sure you want to delete this scheduled post? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm,
    }, { priority: 'high' });
  }, []);

  // Batch schedule modal (for multiple posts)
  const openBatchScheduleModal = useCallback((postIds: string[]) => {
    return openModal('bulkSchedule', {
      posts: postIds.map(id => ({ id })), // Convert to expected format
    }, { urlSync: false });
  }, [openModal]);

  return {
    // Main actions
    openScheduleModal,
    openEditScheduledModal,
    openRescheduleModal,
    openDeleteConfirmation,
    openBatchScheduleModal,
    
    // Generic actions
    closeModal: closeURLModal,
    updateModalData,
  };
}

/**
 * Hook to check if a specific scheduler modal is open
 */
export function useIsSchedulerModalOpen(eventId?: string, postId?: string) {
  const activeModal = useModalStore(state => state.getActiveModal());
  
  if (!activeModal) return false;
  
  // Check if it's a scheduler-related modal
  const schedulerModals = ['schedulePost', 'editScheduledPost'];
  if (!schedulerModals.includes(activeModal.type)) return false;
  
  // Check specific IDs
  const data = activeModal.data as any;
  if (eventId && data?.eventId === eventId) return true;
  if (postId && data?.postId === postId) return true;
  
  return false;
}