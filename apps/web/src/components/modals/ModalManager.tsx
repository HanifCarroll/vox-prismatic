/**
 * Global Modal Manager Component
 * 
 * Renders all active modals and handles URL synchronization.
 * Place this at the root of your application.
 */

import React, { useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModalStore } from '@/lib/stores/modal-store';
import type { ModalType } from '@/lib/stores/modal-store';
import { Loader2 } from 'lucide-react';

/**
 * ★ Insight ─────────────────────────────────────
 * Lazy loading modal components:
 * - Reduces initial bundle size
 * - Modals load only when needed
 * - Better performance for large applications
 * ─────────────────────────────────────────────────
 */

// ===== Lazy Load Modal Components =====
const modalComponents: Partial<Record<ModalType, React.LazyExoticComponent<any>>> = {
  // Scheduler modals
  schedulerPost: lazy(() => import('../scheduler/PostModal')),
  bulkSchedule: lazy(() => import('../BulkScheduleModal')),
  schedulePost: lazy(() => import('../content/modals/SchedulePostModal')),
  
  // Content modals
  viewPost: lazy(() => import('../content/modals/PostModal')),
  editPost: lazy(() => import('../content/modals/PostModal')),
  
  // Transcript modals
  inputTranscript: lazy(() => import('../content/modals/TranscriptInputModal')),
  viewTranscript: lazy(() => import('../content/modals/TranscriptModal')),
  editTranscript: lazy(() => import('../content/modals/TranscriptModal')),
  
  // Insight modals
  viewInsight: lazy(() => import('../content/modals/InsightModal')),
  editInsight: lazy(() => import('../content/modals/InsightModal')),
  
  // Prompt modals
  viewPrompt: lazy(() => import('../prompts/PromptModal')),
  editPrompt: lazy(() => import('../prompts/PromptModal')),
  
  // Utility modals
  confirmation: lazy(() => import('../ConfirmationDialog')),
};

// ===== Loading Fallback =====
function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-8 shadow-xl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    </div>
  );
}

// ===== Modal Manager Component =====
export function ModalManager() {
  const [searchParams] = useSearchParams();
  const { modals, activeModalId, syncWithURL, closeModal } = useModalStore();
  const { closeURLModal } = useURLModal();

  // Sync with URL on mount and when URL changes
  useEffect(() => {
    syncWithURL(searchParams);
  }, [searchParams, syncWithURL]);

  // Get active modal
  const activeModal = activeModalId ? modals.get(activeModalId) : null;

  if (!activeModal?.isOpen) {
    return null;
  }

  const ModalComponent = modalComponents[activeModal.type];
  
  if (!ModalComponent) {
    console.error(`No component found for modal type: ${activeModal.type}`);
    return null;
  }

  // Transform modal data to match BaseModalProps interface
  const getModalProps = () => {
    // All modals now use the standardized BaseModalProps interface
    return {
      isOpen: activeModal.isOpen,
      onClose: () => {
        // Close modal in store
        closeModal(activeModal.id);
        // Also clear URL params for URL-synced modals
        closeURLModal();
      },
      data: activeModal.data,
    };
  };

  return (
    <Suspense fallback={<ModalLoadingFallback />}>
      <ModalComponent {...getModalProps()} />
    </Suspense>
  );
}

// ===== Hook for URL-synced modal opening =====
export function useURLModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openModal, closeModal, closeAllModals } = useModalStore();

  const openURLModal = React.useCallback((
    type: ModalType,
    data?: any,
    options?: { replace?: boolean }
  ) => {
    const newParams = new URLSearchParams(searchParams);
    
    // Set modal type
    newParams.set('modal', type);
    
    // Set modal data as URL params
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          newParams.set(key, String(value));
        }
      });
    }
    
    // Update URL (this will trigger syncWithURL via useEffect)
    setSearchParams(newParams, { replace: options?.replace });
  }, [searchParams, setSearchParams]);

  const closeURLModal = React.useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    
    // Remove all modal-related params
    // These are the common params used by modals
    const modalParams = ['modal', 'mode', 'eventId', 'postId', 'initialDateTime', 'initialPlatform'];
    modalParams.forEach(key => newParams.delete(key));
    
    // Also remove any other params that might be modal-specific
    // by checking if they were added for modal purposes
    newParams.forEach((_, key) => {
      if (key.startsWith('modal')) {
        newParams.delete(key);
      }
    });
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  return {
    openURLModal,
    closeURLModal,
    openModal, // Direct store access for non-URL modals
    closeModal,
    closeAllModals,
  };
}