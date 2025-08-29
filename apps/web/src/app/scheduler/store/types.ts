import type { CalendarEvent, PostView } from '@/types';
import type { 
  CalendarView, 
  CalendarFilters, 
  PostModalState, 
  ApprovedPost,
  Platform 
} from '@/types/scheduler';

// Modal types for scheduler
export enum SchedulerModalType {
  POST_SCHEDULE = 'post_schedule',
  POST_EDIT = 'post_edit',
}

// Calendar state slice
export interface CalendarSlice {
  calendar: {
    view: CalendarView;
    currentDate: Date;
    today: Date;
  };
  
  // Calendar actions
  setView: (view: CalendarView) => void;
  setCurrentDate: (date: Date) => void;
  navigateToDate: (date: Date) => void;
  navigatePrevious: () => void;
  navigateNext: () => void;
  navigateToday: () => void;
}

// Filters state slice
export interface FiltersSlice {
  filters: CalendarFilters;
  
  // Filter actions
  setFilters: (filters: CalendarFilters) => void;
  setPlatforms: (platforms: Platform[]) => void;
  setStatus: (status: string) => void;
  resetFilters: () => void;
}

// Modal state slice
export interface SchedulerModalSlice {
  modal: PostModalState;
  
  // Modal actions
  setModal: (modal: PostModalState) => void;
  openModal: (modalType: SchedulerModalType, data?: any) => void;
  closeModal: () => void;
  setPostData: (data: any) => void;
  clearModalData: () => void;
}

// Server data slice for scheduler-specific data
export interface SchedulerServerDataSlice {
  // Events data
  eventsData: CalendarEvent[];
  eventsLoading: boolean;
  eventsError: string | null;
  
  // Approved posts data (derived from content store but cached here)
  approvedPostsData: ApprovedPost[];
  approvedPostsLoading: boolean;
  approvedPostsError: string | null;
  
  // Server data actions
  setEventsData: (events: CalendarEvent[]) => void;
  setEventsLoading: (loading: boolean) => void;
  setEventsError: (error: string | null) => void;
  
  setApprovedPostsData: (posts: ApprovedPost[]) => void;
  setApprovedPostsLoading: (loading: boolean) => void;
  setApprovedPostsError: (error: string | null) => void;
  
  // Data refresh actions
  refreshEvents: () => Promise<void>;
  refreshApprovedPosts: () => Promise<void>;
}

// Combined scheduler store type
export type SchedulerStore = CalendarSlice & FiltersSlice & SchedulerModalSlice & SchedulerServerDataSlice;