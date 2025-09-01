import { Injectable, signal, computed } from '@angular/core';
import { Platform } from '../models/project.model';

/**
 * Global Modal State Service
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

export interface SchedulerPostModalData {
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

export interface ContentPostModalData {
  postId?: string;
  post?: any; // PostView type
  isOpen: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialMode?: 'view' | 'edit';
}

export interface SchedulePostModalData {
  postId?: string;
  post?: any; // PostView type
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export interface BulkScheduleModalData {
  posts: any[]; // PostView[]
  onSchedule?: (schedules: Array<{ postId: string; scheduledFor: Date }>) => Promise<void>;
}

export interface TranscriptModalData {
  transcriptId?: string;
  transcript?: any; // TranscriptView type
  isOpen: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialMode?: 'view' | 'edit';
}

export interface TranscriptInputModalData {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit?: (data: { title: string; content: string; fileName?: string }) => void;
}

export interface InsightModalData {
  insightId?: string;
  insight?: any; // InsightView type
  isOpen: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
  initialMode?: 'view' | 'edit';
}

export interface PromptModalData {
  promptName: string | null;
  promptData: any | null; // PromptData type
  onUpdate?: (data: any) => void;
}

export interface ConfirmationModalData {
  isOpen: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export interface ErrorModalData {
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

@Injectable({
  providedIn: 'root'
})
export class ModalStateService {
  // State using Angular signals
  private modals = signal<Map<string, Modal>>(new Map());
  private activeModalId = signal<string | null>(null);
  private modalStack = signal<string[]>([]);
  private history = signal<Modal[]>([]);
  
  // Computed values
  hasOpenModals = computed(() => this.modals().size > 0);
  activeModal = computed(() => {
    const id = this.activeModalId();
    return id ? this.modals().get(id) : undefined;
  });
  
  /**
   * Open a new modal
   */
  openModal<T extends ModalData>(
    type: ModalType,
    data?: T,
    options?: {
      id?: string;
      priority?: Modal['priority'];
      urlSync?: boolean;
      replace?: boolean; // Replace current modal instead of stacking
    }
  ): string {
    const id = options?.id || `${type}-${Date.now()}`;
    const modal: Modal = {
      id,
      type,
      data,
      isOpen: true,
      priority: options?.priority || 'normal',
      createdAt: Date.now(),
      urlSyncEnabled: options?.urlSync ?? false,
    };
    
    // Update modals map
    const newModals = new Map(this.modals());
    newModals.set(id, modal);
    this.modals.set(newModals);
    
    // Update modal stack
    const currentStack = this.modalStack();
    const newStack = options?.replace 
      ? currentStack.slice(0, -1).concat(id)
      : [...currentStack, id];
    this.modalStack.set(newStack);
    
    // Set as active modal
    this.activeModalId.set(id);
    
    // Add to history (keep last 50)
    const newHistory = [...this.history(), modal].slice(-50);
    this.history.set(newHistory);
    
    return id;
  }
  
  /**
   * Close a modal
   */
  closeModal(id?: string): void {
    const modalId = id || this.activeModalId();
    if (!modalId) return;
    
    // Remove from modals map
    const newModals = new Map(this.modals());
    newModals.delete(modalId);
    this.modals.set(newModals);
    
    // Update modal stack
    const newStack = this.modalStack().filter(stackId => stackId !== modalId);
    this.modalStack.set(newStack);
    
    // Update active modal
    const newActiveId = newStack[newStack.length - 1] || null;
    this.activeModalId.set(newActiveId);
  }
  
  /**
   * Close all modals
   */
  closeAllModals(): void {
    this.modals.set(new Map());
    this.activeModalId.set(null);
    this.modalStack.set([]);
  }
  
  /**
   * Close modals by type
   */
  closeModalsByType(type: ModalType): void {
    const newModals = new Map(this.modals());
    const idsToRemove: string[] = [];
    
    newModals.forEach((modal, id) => {
      if (modal.type === type) {
        idsToRemove.push(id);
      }
    });
    
    idsToRemove.forEach(id => newModals.delete(id));
    this.modals.set(newModals);
    
    // Update stack and active modal
    const newStack = this.modalStack().filter(id => !idsToRemove.includes(id));
    this.modalStack.set(newStack);
    
    const newActiveId = newStack[newStack.length - 1] || null;
    this.activeModalId.set(newActiveId);
  }
  
  /**
   * Update modal data
   */
  updateModalData<T extends ModalData>(id: string, data: Partial<T>): void {
    const modal = this.modals().get(id);
    if (!modal) return;
    
    const updatedData = modal.data 
      ? { ...modal.data, ...data } as ModalData
      : data as unknown as ModalData;
    
    const newModals = new Map(this.modals());
    newModals.set(id, {
      ...modal,
      data: updatedData,
    });
    this.modals.set(newModals);
  }
  
  /**
   * Set active modal
   */
  setActiveModal(id: string): void {
    const modal = this.modals().get(id);
    if (!modal) return;
    
    this.activeModalId.set(id);
    
    // Move to top of stack
    const currentStack = this.modalStack();
    const newStack = [...currentStack.filter(stackId => stackId !== id), id];
    this.modalStack.set(newStack);
  }
  
  /**
   * Get modal by ID
   */
  getModal(id: string): Modal | undefined {
    return this.modals().get(id);
  }
  
  /**
   * Get modals by type
   */
  getModalsByType(type: ModalType): Modal[] {
    const modals: Modal[] = [];
    this.modals().forEach(modal => {
      if (modal.type === type) {
        modals.push(modal);
      }
    });
    return modals;
  }
  
  /**
   * Check if a modal is open
   */
  isModalOpen(id: string): boolean {
    return this.modals().has(id);
  }
  
  /**
   * Check if a modal type is open
   */
  isModalTypeOpen(type: ModalType): boolean {
    return this.getModalsByType(type).some(m => m.isOpen);
  }
  
  /**
   * Push modal to stack
   */
  pushModal(modal: Modal): void {
    const newModals = new Map(this.modals());
    newModals.set(modal.id, modal);
    this.modals.set(newModals);
    
    const newStack = [...this.modalStack(), modal.id];
    this.modalStack.set(newStack);
    this.activeModalId.set(modal.id);
  }
  
  /**
   * Pop modal from stack
   */
  popModal(): Modal | undefined {
    const stack = this.modalStack();
    const modalId = stack[stack.length - 1];
    if (!modalId) return undefined;
    
    const modal = this.modals().get(modalId);
    this.closeModal(modalId);
    
    return modal;
  }
  
  /**
   * Sync with URL parameters
   */
  syncWithURL(searchParams: URLSearchParams): void {
    const modalType = searchParams.get('modal') as ModalType | null;
    if (!modalType) {
      this.closeAllModals();
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
    const existingModal = this.getModalsByType(modalType)[0];
    if (existingModal) {
      this.updateModalData(existingModal.id, modalData);
    } else {
      this.openModal(modalType, modalData, { urlSync: true });
    }
  }
  
  /**
   * Get URL parameters for current modal state
   */
  getURLParams(): URLSearchParams {
    const params = new URLSearchParams();
    const activeModal = this.activeModal();
    
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
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.history.set([]);
  }
  
  // Helper methods for specific modal types
  openSchedulePost(data: SchedulePostModalData, options?: Parameters<typeof this.openModal>[2]): string {
    return this.openModal('schedulePost', data, options);
  }
  
  openConfirmation(data: ConfirmationModalData, options?: Parameters<typeof this.openModal>[2]): string {
    return this.openModal('confirmation', data, { ...options, priority: 'high' });
  }
  
  openError(error: Error | string, details?: string): string {
    return this.openModal('error', {
      error,
      details,
      title: 'Error',
    }, { priority: 'urgent' });
  }
}