import { StateCreator } from 'zustand';
import type { PostSlice, ContentStore } from '../types';
import type { PostView } from '@/types';

const initialPostState = {
  statusFilter: 'all',
  platformFilter: 'all',
  sortBy: 'createdAt-desc',
  selectedItems: [],
  showFilters: false,
  columnVisibility: ['title', 'platform', 'status', 'createdAt', 'scheduledFor', 'characterCount', 'insightTitle'],
};

export const createPostSlice: StateCreator<
  ContentStore,
  [],
  [],
  PostSlice
> = (set, get) => ({
  // State
  posts: initialPostState,
  
  // Actions
  setPostStatusFilter: (filter) =>
    set((state) => ({
      posts: { ...state.posts, statusFilter: filter }
    })),
  
  setPostPlatformFilter: (filter) =>
    set((state) => ({
      posts: { ...state.posts, platformFilter: filter }
    })),
  
  setPostSort: (sort) =>
    set((state) => ({
      posts: { ...state.posts, sortBy: sort }
    })),
  
  setPostSelectedItems: (items) =>
    set((state) => ({
      posts: { ...state.posts, selectedItems: items }
    })),
  
  selectPostItem: (id) =>
    set((state) => ({
      posts: {
        ...state.posts,
        selectedItems: [...state.posts.selectedItems, id]
      }
    })),
  
  deselectPostItem: (id) =>
    set((state) => ({
      posts: {
        ...state.posts,
        selectedItems: state.posts.selectedItems.filter(item => item !== id)
      }
    })),
  
  clearPostSelection: () =>
    set((state) => ({
      posts: { ...state.posts, selectedItems: [] }
    })),
  
  togglePostFilters: () =>
    set((state) => ({
      posts: { ...state.posts, showFilters: !state.posts.showFilters }
    })),
  
  setPostColumnVisibility: (columnId, visible) =>
    set((state) => {
      const newColumns = visible
        ? [...state.posts.columnVisibility, columnId]
        : state.posts.columnVisibility.filter(col => col !== columnId);
      return {
        posts: { ...state.posts, columnVisibility: newColumns }
      };
    }),
  
  resetPostFilters: () =>
    set((state) => ({
      posts: {
        ...state.posts,
        statusFilter: 'all',
        platformFilter: 'all',
        sortBy: 'createdAt-desc',
        selectedItems: []
      }
    })),
  
  // Selection handlers
  handlePostSelect: (id, selected) => {
    const { selectPostItem, deselectPostItem } = get();
    if (selected) {
      selectPostItem(id);
    } else {
      deselectPostItem(id);
    }
  },
  
  handlePostSelectAll: (selected, allItems) => {
    const { setPostSelectedItems, clearPostSelection } = get();
    if (selected) {
      setPostSelectedItems(allItems.map(item => item.id));
    } else {
      clearPostSelection();
    }
  },
  
  handlePostSelectFiltered: (filteredItems) => {
    const { setPostSelectedItems } = get();
    setPostSelectedItems(filteredItems.map(item => item.id));
  },
  
  handlePostSelectByStatus: (status, allItems) => {
    const { setPostSelectedItems } = get();
    const statusItems = allItems.filter(item => item.status === status);
    setPostSelectedItems(statusItems.map(item => item.id));
  },
  
  handlePostSelectByPlatform: (platform, allItems) => {
    const { setPostSelectedItems } = get();
    const platformItems = allItems.filter(item => item.platform === platform);
    setPostSelectedItems(platformItems.map(item => item.id));
  },
  
  handlePostInvertSelection: (allItems) => {
    const { posts, setPostSelectedItems } = get();
    const currentSelected = new Set(posts.selectedItems);
    const inverted = allItems
      .filter(item => !currentSelected.has(item.id))
      .map(item => item.id);
    setPostSelectedItems(inverted);
  },
  
  handlePostSelectDateRange: (start, end, allItems) => {
    const { setPostSelectedItems } = get();
    const rangeItems = allItems.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });
    setPostSelectedItems(rangeItems.map(item => item.id));
  },
});