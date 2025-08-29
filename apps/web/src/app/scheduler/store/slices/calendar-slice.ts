import { StateCreator } from 'zustand';
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  subDays, 
  subWeeks, 
  subMonths 
} from 'date-fns';
import type { CalendarSlice, SchedulerStore } from '../types';
import type { CalendarView } from '@/types/scheduler';

export const createCalendarSlice: StateCreator<
  SchedulerStore,
  [],
  [],
  CalendarSlice
> = (set, get) => ({
  // State
  calendar: {
    view: 'week' as CalendarView,
    currentDate: (() => {
      const date = new Date();
      date.setMinutes(0, 0, 0);
      return date;
    })(),
    today: (() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
  },
  
  // Actions
  setView: (view) => 
    set((state) => ({
      calendar: { ...state.calendar, view }
    })),
  
  setCurrentDate: (date) =>
    set((state) => ({
      calendar: { ...state.calendar, currentDate: date }
    })),
  
  navigateToDate: (date) => 
    set((state) => ({
      calendar: { ...state.calendar, currentDate: date }
    })),
  
  navigatePrevious: () =>
    set((state) => {
      const { view, currentDate } = state.calendar;
      let newDate: Date;
      
      switch (view) {
        case 'day':
          newDate = subDays(currentDate, 1);
          break;
        case 'week':
          newDate = subWeeks(currentDate, 1);
          break;
        case 'month':
          newDate = subMonths(currentDate, 1);
          break;
        default:
          newDate = subWeeks(currentDate, 1);
      }
      
      return {
        calendar: { ...state.calendar, currentDate: newDate }
      };
    }),
  
  navigateNext: () =>
    set((state) => {
      const { view, currentDate } = state.calendar;
      let newDate: Date;
      
      switch (view) {
        case 'day':
          newDate = addDays(currentDate, 1);
          break;
        case 'week':
          newDate = addWeeks(currentDate, 1);
          break;
        case 'month':
          newDate = addMonths(currentDate, 1);
          break;
        default:
          newDate = addWeeks(currentDate, 1);
      }
      
      return {
        calendar: { ...state.calendar, currentDate: newDate }
      };
    }),
  
  navigateToday: () =>
    set((state) => ({
      calendar: { 
        ...state.calendar, 
        currentDate: new Date() 
      }
    })),
});