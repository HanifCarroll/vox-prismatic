import { StateCreator } from 'zustand';
import type { FiltersSlice, SchedulerStore } from '../types';
import type { CalendarFilters, Platform } from '@/types/scheduler';
import { Platform as PlatformEnum } from '@/types';

const initialFilters: CalendarFilters = {
  platforms: [PlatformEnum.LINKEDIN, PlatformEnum.X],
  status: 'all'
};

export const createFiltersSlice: StateCreator<
  SchedulerStore,
  [],
  [],
  FiltersSlice
> = (set, get) => ({
  // State
  filters: initialFilters,
  
  // Actions
  setFilters: (filters) =>
    set({ filters }),
  
  setPlatforms: (platforms) =>
    set((state) => ({
      filters: { ...state.filters, platforms }
    })),
  
  setStatus: (status) =>
    set((state) => ({
      filters: { ...state.filters, status }
    })),
  
  resetFilters: () =>
    set({ filters: initialFilters }),
});