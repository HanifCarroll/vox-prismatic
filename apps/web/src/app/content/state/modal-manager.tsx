import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import type { TranscriptView, InsightView, PostView } from '@/types';

// Modal types enum for better type safety
export enum ModalType {
  TRANSCRIPT_INPUT = 'transcript_input',
  TRANSCRIPT_VIEW = 'transcript_view', 
  TRANSCRIPT_EDIT = 'transcript_edit',
  INSIGHT_VIEW = 'insight_view',
  POST_VIEW = 'post_view',
  POST_SCHEDULE = 'post_schedule',
  BULK_SCHEDULE = 'bulk_schedule',
}

// Modal state interface
export interface ModalState {
  // Active modals
  activeModals: Set<ModalType>;
  
  // Modal data
  selectedTranscript: TranscriptView | null;
  selectedInsight: InsightView | null;
  selectedPost: PostView | null;
  postToSchedule: PostView | null;
  
  // Modal modes
  transcriptModalMode: 'view' | 'edit';
}

// Modal actions
export type ModalAction =
  | { type: 'OPEN_MODAL'; payload: { modalType: ModalType; data?: any } }
  | { type: 'CLOSE_MODAL'; payload: ModalType }
  | { type: 'CLOSE_ALL_MODALS' }
  | { type: 'SET_TRANSCRIPT_DATA'; payload: { transcript: TranscriptView; mode: 'view' | 'edit' } }
  | { type: 'SET_INSIGHT_DATA'; payload: InsightView }
  | { type: 'SET_POST_DATA'; payload: PostView }
  | { type: 'SET_SCHEDULE_POST_DATA'; payload: PostView }
  | { type: 'CLEAR_MODAL_DATA'; payload: ModalType };

const initialModalState: ModalState = {
  activeModals: new Set(),
  selectedTranscript: null,
  selectedInsight: null,
  selectedPost: null,
  postToSchedule: null,
  transcriptModalMode: 'view',
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_MODAL': {
      const { modalType, data } = action.payload;
      const newActiveModals = new Set(state.activeModals);
      newActiveModals.add(modalType);
      
      let updatedState = { 
        ...state, 
        activeModals: newActiveModals 
      };
      
      // Set data if provided
      if (data) {
        switch (modalType) {
          case ModalType.TRANSCRIPT_VIEW:
          case ModalType.TRANSCRIPT_EDIT:
            updatedState.selectedTranscript = data.transcript;
            updatedState.transcriptModalMode = data.mode;
            break;
          case ModalType.INSIGHT_VIEW:
            updatedState.selectedInsight = data;
            break;
          case ModalType.POST_VIEW:
            updatedState.selectedPost = data;
            break;
          case ModalType.POST_SCHEDULE:
            updatedState.postToSchedule = data;
            break;
        }
      }
      
      return updatedState;
    }
    
    case 'CLOSE_MODAL': {
      const modalType = action.payload;
      const newActiveModals = new Set(state.activeModals);
      newActiveModals.delete(modalType);
      
      let updatedState = { 
        ...state, 
        activeModals: newActiveModals 
      };
      
      // Clear related data when closing modal
      switch (modalType) {
        case ModalType.TRANSCRIPT_VIEW:
        case ModalType.TRANSCRIPT_EDIT:
          updatedState.selectedTranscript = null;
          break;
        case ModalType.INSIGHT_VIEW:
          updatedState.selectedInsight = null;
          break;
        case ModalType.POST_VIEW:
          updatedState.selectedPost = null;
          break;
        case ModalType.POST_SCHEDULE:
          updatedState.postToSchedule = null;
          break;
      }
      
      return updatedState;
    }
    
    case 'CLOSE_ALL_MODALS':
      return {
        ...initialModalState,
        activeModals: new Set(),
      };
    
    case 'SET_TRANSCRIPT_DATA':
      return {
        ...state,
        selectedTranscript: action.payload.transcript,
        transcriptModalMode: action.payload.mode,
      };
    
    case 'SET_INSIGHT_DATA':
      return {
        ...state,
        selectedInsight: action.payload,
      };
    
    case 'SET_POST_DATA':
      return {
        ...state,
        selectedPost: action.payload,
      };
    
    case 'SET_SCHEDULE_POST_DATA':
      return {
        ...state,
        postToSchedule: action.payload,
      };
    
    case 'CLEAR_MODAL_DATA': {
      const modalType = action.payload;
      let updatedState = { ...state };
      
      switch (modalType) {
        case ModalType.TRANSCRIPT_VIEW:
        case ModalType.TRANSCRIPT_EDIT:
          updatedState.selectedTranscript = null;
          break;
        case ModalType.INSIGHT_VIEW:
          updatedState.selectedInsight = null;
          break;
        case ModalType.POST_VIEW:
          updatedState.selectedPost = null;
          break;
        case ModalType.POST_SCHEDULE:
          updatedState.postToSchedule = null;
          break;
      }
      
      return updatedState;
    }
    
    default:
      return state;
  }
}

// Hook for modal management
export function useModalManager() {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);

  // Modal actions
  const actions = useMemo(() => ({
    // Generic modal actions
    openModal: (modalType: ModalType, data?: any) =>
      dispatch({ type: 'OPEN_MODAL', payload: { modalType, data } }),
    
    closeModal: (modalType: ModalType) =>
      dispatch({ type: 'CLOSE_MODAL', payload: modalType }),
    
    closeAllModals: () =>
      dispatch({ type: 'CLOSE_ALL_MODALS' }),
    
    // Specific modal actions for better DX
    showTranscriptInput: () =>
      dispatch({ type: 'OPEN_MODAL', payload: { modalType: ModalType.TRANSCRIPT_INPUT } }),
    
    showTranscriptModal: (transcript: TranscriptView, mode: 'view' | 'edit' = 'view') =>
      dispatch({ 
        type: 'OPEN_MODAL', 
        payload: { 
          modalType: mode === 'view' ? ModalType.TRANSCRIPT_VIEW : ModalType.TRANSCRIPT_EDIT,
          data: { transcript, mode }
        }
      }),
    
    hideTranscriptModal: () => {
      dispatch({ type: 'CLOSE_MODAL', payload: ModalType.TRANSCRIPT_VIEW });
      dispatch({ type: 'CLOSE_MODAL', payload: ModalType.TRANSCRIPT_EDIT });
    },
    
    showInsightModal: (insight: InsightView) =>
      dispatch({ 
        type: 'OPEN_MODAL', 
        payload: { modalType: ModalType.INSIGHT_VIEW, data: insight }
      }),
    
    hideInsightModal: () =>
      dispatch({ type: 'CLOSE_MODAL', payload: ModalType.INSIGHT_VIEW }),
    
    showPostModal: (post: PostView) =>
      dispatch({ 
        type: 'OPEN_MODAL', 
        payload: { modalType: ModalType.POST_VIEW, data: post }
      }),
    
    hidePostModal: () =>
      dispatch({ type: 'CLOSE_MODAL', payload: ModalType.POST_VIEW }),
    
    showScheduleModal: (post: PostView) =>
      dispatch({ 
        type: 'OPEN_MODAL', 
        payload: { modalType: ModalType.POST_SCHEDULE, data: post }
      }),
    
    hideScheduleModal: () =>
      dispatch({ type: 'CLOSE_MODAL', payload: ModalType.POST_SCHEDULE }),
    
    showBulkScheduleModal: () =>
      dispatch({ type: 'OPEN_MODAL', payload: { modalType: ModalType.BULK_SCHEDULE } }),
    
    hideBulkScheduleModal: () =>
      dispatch({ type: 'CLOSE_MODAL', payload: ModalType.BULK_SCHEDULE }),
  }), []);

  // Modal state getters
  const modalState = useMemo(() => ({
    // Check if specific modals are open
    isTranscriptInputOpen: state.activeModals.has(ModalType.TRANSCRIPT_INPUT),
    isTranscriptModalOpen: state.activeModals.has(ModalType.TRANSCRIPT_VIEW) || state.activeModals.has(ModalType.TRANSCRIPT_EDIT),
    isInsightModalOpen: state.activeModals.has(ModalType.INSIGHT_VIEW),
    isPostModalOpen: state.activeModals.has(ModalType.POST_VIEW),
    isScheduleModalOpen: state.activeModals.has(ModalType.POST_SCHEDULE),
    isBulkScheduleModalOpen: state.activeModals.has(ModalType.BULK_SCHEDULE),
    
    // General modal state
    hasActiveModals: state.activeModals.size > 0,
    activeModalCount: state.activeModals.size,
    
    // Data
    selectedTranscript: state.selectedTranscript,
    selectedInsight: state.selectedInsight,
    selectedPost: state.selectedPost,
    postToSchedule: state.postToSchedule,
    transcriptModalMode: state.transcriptModalMode,
  }), [state]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && modalState.hasActiveModals) {
      actions.closeAllModals();
    }
  }, [modalState.hasActiveModals, actions]);

  return {
    state,
    actions,
    modalState,
    handleKeyDown,
    dispatch, // For advanced usage
  };
}

// Context for modal management
export const ModalManagerContext = createContext<{
  state: ModalState;
  actions: ReturnType<typeof useModalManager>['actions'];
  modalState: ReturnType<typeof useModalManager>['modalState'];
  handleKeyDown: ReturnType<typeof useModalManager>['handleKeyDown'];
} | null>(null);

export function useModalManagerContext() {
  const context = useContext(ModalManagerContext);
  if (!context) {
    throw new Error('useModalManagerContext must be used within ModalManagerProvider');
  }
  return context;
}

// Provider component for easier usage
export function ModalManagerProvider({ children }: { children: React.ReactNode }) {
  const modalManager = useModalManager();
  
  return (
    <ModalManagerContext.Provider value={modalManager}>
      {children}
    </ModalManagerContext.Provider>
  );
}