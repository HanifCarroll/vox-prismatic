/**
 * Global Modal Store
 * 
 * Centralized modal management for the entire application.
 * Supports multiple modal types with type-safe configurations.
 * 
 * Features:
 * - Single source of truth for all modals
 * - URL synchronization for shareable states
 * - Type-safe modal configurations
 * - Stack support for nested modals
 * - History tracking for undo/redo
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Platform } from '@/types';

/**
 * ★ Insight ─────────────────────────────────────
 * Modal Types Registry:
 * Each modal type has its own configuration and data requirements.
 * This ensures type safety and prevents invalid modal states.
 * ─────────────────────────────────────────────────
 */

// ===== Modal Type Definitions =====

export type ModalType = 
  // Scheduler modals
  | 'schedulerPost'        // Scheduler-specific post modal
  | 'bulkSchedule'         // Schedule multiple posts
  | 'schedulePost'         // Schedule single post
  
  // Content modals
  | 'viewPost'
  | 'editPost'
  
  // Transcript modals
  | 'inputTranscript'      // New transcript input
  | 'viewTranscript'
  | 'editTranscript'
  
  // Insight modals  
  | 'viewInsight'
  | 'editInsight'
  
  // Prompt modals
  | 'viewPrompt'
  | 'editPrompt'
  
  // Utility modals
  | 'confirmation'
  | 'error';

// ===== Modal Data Configurations =====
// These match the exact props expected by each modal component

interface SchedulerPostModalData {
  modalState: {
    isOpen: boolean;
    mode: 'create' | 'edit';
    postId?: string;
    eventId?: string;
    initialDateTime?: Date;
    initialPlatform?: Platform;
  };
  closeModal?: () => void;
}

interface ContentPostModalData {
  postId?: string;
  post?: any; // PostView type
  isOpen: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialMode?: 'view' | 'edit';
}

interface SchedulePostModalData {
  postId?: string;
  post?: any; // PostView type
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface BulkScheduleModalData {
  posts: any[]; // PostView[]
  onSchedule?: (schedules: Array<{ postId: string; scheduledFor: Date }>) => Promise<void>;
}

interface TranscriptModalData {
  transcriptId?: string;
  transcript?: any; // TranscriptView type
  isOpen: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialMode?: 'view' | 'edit';
}

interface TranscriptInputModalData {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit?: (data: { title: string; content: string; fileName?: string }) => void;
}

interface InsightModalData {
  insightId?: string;
  insight?: any; // InsightView type
  isOpen: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialMode?: 'view' | 'edit';
}

interface PromptModalData {
  promptName: string | null;
  promptData: any | null; // PromptData type
  onUpdate?: (data: any) => void;
}

interface ConfirmationModalData {
  isOpen: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

interface ErrorModalData {
  error: Error | string;
  details?: string;
  title?: string;
}

// ===== Modal State Types =====

export type ModalData = 
  | SchedulerPostModalData
  | ContentPostModalData
  | SchedulePostModalData
  | BulkScheduleModalData
  | TranscriptModalData
  | TranscriptInputModalData
  | InsightModalData
  | PromptModalData
  | ConfirmationModalData
  | ErrorModalData;

export interface Modal {
  id: string;
  type: ModalType;
  data?: ModalData;
  isOpen: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
  urlSyncEnabled?: boolean; // Whether this modal should sync with URL
}

// ===== Store Interface =====

interface ModalStore {
  // State
  modals: Map<string, Modal>;
  activeModalId: string | null;
  modalStack: string[]; // For nested modals
  history: Modal[]; // For undo functionality
  
  // Core Actions
  openModal: <T extends ModalData>(
    type: ModalType,
    data?: T,
    options?: {
      id?: string;
      priority?: Modal['priority'];
      urlSync?: boolean;
      replace?: boolean; // Replace current modal instead of stacking
    }
  ) => string;
  
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  closeModalsByType: (type: ModalType) => void;
  
  // Update Actions
  updateModalData: <T extends ModalData>(id: string, data: Partial<T>) => void;
  setActiveModal: (id: string) => void;
  
  // Stack Management
  pushModal: (modal: Modal) => void;
  popModal: () => Modal | undefined;
  
  // Queries
  getModal: (id: string) => Modal | undefined;
  getModalsByType: (type: ModalType) => Modal[];
  getActiveModal: () => Modal | undefined;
  hasOpenModals: () => boolean;
  isModalOpen: (id: string) => boolean;
  
  // URL Sync
  syncWithURL: (searchParams: URLSearchParams) => void;
  getURLParams: () => URLSearchParams;
  
  // History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

// ===== Store Implementation =====

export const useModalStore = create<ModalStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      modals: new Map(),
      activeModalId: null,
      modalStack: [],
      history: [],
      
      // Open Modal
      openModal: (type, data, options = {}) => {
        const id = options.id || `${type}-${Date.now()}`;
        const modal: Modal = {
          id,
          type,
          data,
          isOpen: true,
          priority: options.priority || 'normal',
          createdAt: Date.now(),
          urlSyncEnabled: options.urlSync ?? false,
        };
        
        set((state) => {
          const modals = new Map(state.modals);
          modals.set(id, modal);
          
          const modalStack = options.replace 
            ? state.modalStack.slice(0, -1).concat(id)
            : [...state.modalStack, id];
          
          return {
            modals,
            activeModalId: id,
            modalStack,
            history: [...state.history, modal].slice(-50), // Keep last 50 for history
          };
        });
        
        return id;
      },
      
      // Close Modal
      closeModal: (id) => {
        const modalId = id || get().activeModalId;
        if (!modalId) return;
        
        set((state) => {
          const modals = new Map(state.modals);
          modals.delete(modalId);
          
          const modalStack = state.modalStack.filter(stackId => stackId !== modalId);
          const activeModalId = modalStack[modalStack.length - 1] || null;
          
          return {
            modals,
            modalStack,
            activeModalId,
          };
        });
      },
      
      // Close All Modals
      closeAllModals: () => {
        set({
          modals: new Map(),
          activeModalId: null,
          modalStack: [],
        });
      },
      
      // Close Modals by Type
      closeModalsByType: (type) => {
        set((state) => {
          const modals = new Map(state.modals);
          const idsToRemove: string[] = [];
          
          modals.forEach((modal, id) => {
            if (modal.type === type) {
              idsToRemove.push(id);
            }
          });
          
          idsToRemove.forEach(id => modals.delete(id));
          
          const modalStack = state.modalStack.filter(id => !idsToRemove.includes(id));
          const activeModalId = modalStack[modalStack.length - 1] || null;
          
          return {
            modals,
            modalStack,
            activeModalId,
          };
        });
      },
      
      // Update Modal Data
      updateModalData: (id, data) => {
        set((state) => {
          const modals = new Map(state.modals);
          const modal = modals.get(id);
          
          if (modal) {
            const updatedData = modal.data 
              ? { ...modal.data, ...data } as ModalData
              : data as unknown as ModalData;
            
            modals.set(id, {
              ...modal,
              data: updatedData,
            });
          }
          
          return { modals };
        });
      },
      
      // Set Active Modal
      setActiveModal: (id) => {
        const modal = get().modals.get(id);
        if (!modal) return;
        
        set((state) => ({
          activeModalId: id,
          modalStack: [...state.modalStack.filter(stackId => stackId !== id), id],
        }));
      },
      
      // Stack Management
      pushModal: (modal) => {
        set((state) => {
          const modals = new Map(state.modals);
          modals.set(modal.id, modal);
          
          return {
            modals,
            modalStack: [...state.modalStack, modal.id],
            activeModalId: modal.id,
          };
        });
      },
      
      popModal: () => {
        const state = get();
        const modalId = state.modalStack[state.modalStack.length - 1];
        if (!modalId) return undefined;
        
        const modal = state.modals.get(modalId);
        get().closeModal(modalId);
        
        return modal;
      },
      
      // Queries
      getModal: (id) => get().modals.get(id),
      
      getModalsByType: (type) => {
        const modals: Modal[] = [];
        get().modals.forEach(modal => {
          if (modal.type === type) {
            modals.push(modal);
          }
        });
        return modals;
      },
      
      getActiveModal: () => {
        const activeId = get().activeModalId;
        return activeId ? get().modals.get(activeId) : undefined;
      },
      
      hasOpenModals: () => get().modals.size > 0,
      
      isModalOpen: (id) => get().modals.has(id),
      
      // URL Synchronization
      syncWithURL: (searchParams) => {
        const modalType = searchParams.get('modal') as ModalType | null;
        if (!modalType) {
          get().closeAllModals();
          return;
        }
        
        // Parse modal data from URL
        const modalData: any = {};
        searchParams.forEach((value, key) => {
          if (key !== 'modal') {
            modalData[key] = value;
          }
        });
        
        // Open or update modal
        const existingModal = get().getModalsByType(modalType)[0];
        if (existingModal) {
          get().updateModalData(existingModal.id, modalData);
        } else {
          get().openModal(modalType, modalData, { urlSync: true });
        }
      },
      
      getURLParams: () => {
        const params = new URLSearchParams();
        const activeModal = get().getActiveModal();
        
        if (activeModal?.urlSyncEnabled) {
          params.set('modal', activeModal.type);
          
          if (activeModal.data) {
            Object.entries(activeModal.data).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                params.set(key, String(value));
              }
            });
          }
        }
        
        return params;
      },
      
      // History Management
      undo: () => {
        // Implementation for undo
        console.log('Undo not yet implemented');
      },
      
      redo: () => {
        // Implementation for redo
        console.log('Redo not yet implemented');
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
    })),
    {
      name: 'modal-store',
    }
  )
);

// ===== Selector Hooks =====

export const useActiveModal = () => 
  useModalStore(state => state.getActiveModal());

export const useModalOpen = (type: ModalType) =>
  useModalStore(state => state.getModalsByType(type).some(m => m.isOpen));

export const useModalActions = () =>
  useModalStore(state => ({
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeAllModals: state.closeAllModals,
    updateModalData: state.updateModalData,
  }));

// ===== Helper Functions =====

/**
 * Type-safe modal opener functions
 */
export const modalHelpers = {
  openSchedulePost: (data: SchedulePostModalData, options?: Parameters<ModalStore['openModal']>[2]) =>
    useModalStore.getState().openModal('schedulePost', data, options),
    
  openConfirmation: (data: ConfirmationModalData, options?: Parameters<ModalStore['openModal']>[2]) =>
    useModalStore.getState().openModal('confirmation', data, { ...options, priority: 'high' }),
    
  openError: (error: Error | string, details?: string) =>
    useModalStore.getState().openModal('error', {
      error,
      details,
      title: 'Error',
    }, { priority: 'urgent' }),
};