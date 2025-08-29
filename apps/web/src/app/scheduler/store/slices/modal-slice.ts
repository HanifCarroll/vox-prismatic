import { StateCreator } from 'zustand';
import type { SchedulerModalSlice, SchedulerStore, SchedulerModalType } from '../types';
import type { PostModalState } from '@/types/scheduler';

const initialModalState: PostModalState = {
  isOpen: false,
  mode: 'create'
};

export const createSchedulerModalSlice: StateCreator<
  SchedulerStore,
  [],
  [],
  SchedulerModalSlice
> = (set, get) => ({
  // State
  modal: initialModalState,
  
  // Actions
  setModal: (modal) =>
    set({ modal }),
  
  openModal: (modalType, data) =>
    set((state) => {
      let updatedModal: PostModalState = {
        ...state.modal,
        isOpen: true,
      };
      
      // Set modal data based on type and provided data
      if (data) {
        switch (modalType) {
          case 'post_schedule' as SchedulerModalType:
            updatedModal = {
              ...updatedModal,
              mode: 'create',
              postId: data.postId,
              postData: data.postData,
              initialPlatform: data.initialPlatform,
              initialDateTime: data.initialDateTime,
              onSave: data.onSave,
              onClose: data.onClose,
            };
            break;
          case 'post_edit' as SchedulerModalType:
            updatedModal = {
              ...updatedModal,
              mode: 'edit',
              postId: data.postId,
              postData: data.postData,
              onSave: data.onSave,
              onClose: data.onClose,
            };
            break;
        }
      }
      
      return { modal: updatedModal };
    }),
  
  closeModal: () =>
    set({ modal: initialModalState }),
  
  setPostData: (data) =>
    set((state) => ({
      modal: {
        ...state.modal,
        postData: data,
      }
    })),
  
  clearModalData: () =>
    set((state) => ({
      modal: {
        ...state.modal,
        postId: undefined,
        postData: undefined,
        initialDateTime: undefined,
        initialPlatform: undefined,
        onSave: undefined,
        onClose: undefined,
      }
    })),
});