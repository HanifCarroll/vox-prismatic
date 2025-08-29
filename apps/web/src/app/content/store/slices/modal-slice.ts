import { StateCreator } from 'zustand';
import type { ModalSlice, ContentStore, ModalType } from '../types';
import type { TranscriptView, InsightView, PostView } from '@/types';

const initialModalState = {
  activeModals: new Set<ModalType>(),
  selectedTranscript: null,
  selectedInsight: null,
  selectedPost: null,
  postToSchedule: null,
  transcriptModalMode: 'view' as 'view' | 'edit',
};

export const createModalSlice: StateCreator<
  ContentStore,
  [],
  [],
  ModalSlice
> = (set, get) => ({
  // State
  modals: initialModalState,
  
  // Actions
  openModal: (modalType, data) =>
    set((state) => {
      const newActiveModals = new Set(state.modals.activeModals);
      newActiveModals.add(modalType);
      
      let updatedModals = {
        ...state.modals,
        activeModals: newActiveModals,
      };
      
      // Set data if provided
      if (data) {
        switch (modalType) {
          case 'transcript_view' as ModalType:
          case 'transcript_edit' as ModalType:
            updatedModals.selectedTranscript = data.transcript;
            updatedModals.transcriptModalMode = data.mode;
            break;
          case 'insight_view' as ModalType:
            updatedModals.selectedInsight = data;
            break;
          case 'post_view' as ModalType:
            updatedModals.selectedPost = data;
            break;
          case 'post_schedule' as ModalType:
            updatedModals.postToSchedule = data;
            break;
        }
      }
      
      return { modals: updatedModals };
    }),
  
  closeModal: (modalType) =>
    set((state) => {
      const newActiveModals = new Set(state.modals.activeModals);
      newActiveModals.delete(modalType);
      
      let updatedModals = {
        ...state.modals,
        activeModals: newActiveModals,
      };
      
      // Clear related data when closing modal
      switch (modalType) {
        case 'transcript_view' as ModalType:
        case 'transcript_edit' as ModalType:
          updatedModals.selectedTranscript = null;
          break;
        case 'insight_view' as ModalType:
          updatedModals.selectedInsight = null;
          break;
        case 'post_view' as ModalType:
          updatedModals.selectedPost = null;
          break;
        case 'post_schedule' as ModalType:
          updatedModals.postToSchedule = null;
          break;
      }
      
      return { modals: updatedModals };
    }),
  
  closeAllModals: () =>
    set((state) => ({
      modals: {
        ...initialModalState,
        activeModals: new Set(),
      }
    })),
  
  setTranscriptData: (transcript, mode) =>
    set((state) => ({
      modals: {
        ...state.modals,
        selectedTranscript: transcript,
        transcriptModalMode: mode,
      }
    })),
  
  setInsightData: (insight) =>
    set((state) => ({
      modals: {
        ...state.modals,
        selectedInsight: insight,
      }
    })),
  
  setPostData: (post) =>
    set((state) => ({
      modals: {
        ...state.modals,
        selectedPost: post,
      }
    })),
  
  setSchedulePostData: (post) =>
    set((state) => ({
      modals: {
        ...state.modals,
        postToSchedule: post,
      }
    })),
  
  clearModalData: (modalType) =>
    set((state) => {
      let updatedModals = { ...state.modals };
      
      switch (modalType) {
        case 'transcript_view' as ModalType:
        case 'transcript_edit' as ModalType:
          updatedModals.selectedTranscript = null;
          break;
        case 'insight_view' as ModalType:
          updatedModals.selectedInsight = null;
          break;
        case 'post_view' as ModalType:
          updatedModals.selectedPost = null;
          break;
        case 'post_schedule' as ModalType:
          updatedModals.postToSchedule = null;
          break;
      }
      
      return { modals: updatedModals };
    }),
});