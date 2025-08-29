import { StateCreator } from 'zustand';
import type { InsightSlice, ContentStore } from '../types';
import type { InsightView } from '@/types';

const initialInsightState = {
  statusFilter: 'all',
  categoryFilter: 'all',
  postTypeFilter: 'all',
  scoreRange: [0, 20] as [number, number],
  sortBy: 'totalScore',
  sortOrder: 'desc' as 'asc' | 'desc',
  selectedItems: [],
  showFilters: false,
  columnVisibility: ['title', 'type', 'category', 'totalScore', 'status', 'createdAt'],
};

export const createInsightSlice: StateCreator<
  ContentStore,
  [],
  [],
  InsightSlice
> = (set, get) => ({
  // State
  insights: initialInsightState,
  
  // Actions
  setInsightStatusFilter: (filter) =>
    set((state) => ({
      insights: { ...state.insights, statusFilter: filter }
    })),
  
  setInsightCategoryFilter: (filter) =>
    set((state) => ({
      insights: { ...state.insights, categoryFilter: filter }
    })),
  
  setInsightPostTypeFilter: (filter) =>
    set((state) => ({
      insights: { ...state.insights, postTypeFilter: filter }
    })),
  
  setInsightScoreRange: (range) =>
    set((state) => ({
      insights: { ...state.insights, scoreRange: range }
    })),
  
  setInsightSort: (field, order) =>
    set((state) => ({
      insights: { ...state.insights, sortBy: field, sortOrder: order }
    })),
  
  setInsightSelectedItems: (items) =>
    set((state) => ({
      insights: { ...state.insights, selectedItems: items }
    })),
  
  selectInsightItem: (id) =>
    set((state) => ({
      insights: {
        ...state.insights,
        selectedItems: [...state.insights.selectedItems, id]
      }
    })),
  
  deselectInsightItem: (id) =>
    set((state) => ({
      insights: {
        ...state.insights,
        selectedItems: state.insights.selectedItems.filter(item => item !== id)
      }
    })),
  
  clearInsightSelection: () =>
    set((state) => ({
      insights: { ...state.insights, selectedItems: [] }
    })),
  
  toggleInsightFilters: () =>
    set((state) => ({
      insights: { ...state.insights, showFilters: !state.insights.showFilters }
    })),
  
  setInsightColumnVisibility: (columnId, visible) =>
    set((state) => {
      const newColumns = visible
        ? [...state.insights.columnVisibility, columnId]
        : state.insights.columnVisibility.filter(col => col !== columnId);
      return {
        insights: { ...state.insights, columnVisibility: newColumns }
      };
    }),
  
  resetInsightFilters: () =>
    set((state) => ({
      insights: {
        ...state.insights,
        statusFilter: 'all',
        categoryFilter: 'all',
        postTypeFilter: 'all',
        scoreRange: [0, 20],
        sortBy: 'totalScore',
        sortOrder: 'desc',
        selectedItems: []
      }
    })),
  
  // Selection handlers
  handleInsightSelect: (id, selected) => {
    const { selectInsightItem, deselectInsightItem } = get();
    if (selected) {
      selectInsightItem(id);
    } else {
      deselectInsightItem(id);
    }
  },
  
  handleInsightSelectAll: (selected, allItems) => {
    const { setInsightSelectedItems, clearInsightSelection } = get();
    if (selected) {
      setInsightSelectedItems(allItems.map(item => item.id));
    } else {
      clearInsightSelection();
    }
  },
  
  handleInsightSelectFiltered: (filteredItems) => {
    const { setInsightSelectedItems } = get();
    setInsightSelectedItems(filteredItems.map(item => item.id));
  },
  
  handleInsightSelectByStatus: (status, allItems) => {
    const { setInsightSelectedItems } = get();
    const statusItems = allItems.filter(item => item.status === status);
    setInsightSelectedItems(statusItems.map(item => item.id));
  },
  
  handleInsightSelectByCategory: (category, allItems) => {
    const { setInsightSelectedItems } = get();
    const categoryItems = allItems.filter(item => item.category === category);
    setInsightSelectedItems(categoryItems.map(item => item.id));
  },
  
  handleInsightInvertSelection: (allItems) => {
    const { insights, setInsightSelectedItems } = get();
    const currentSelected = new Set(insights.selectedItems);
    const inverted = allItems
      .filter(item => !currentSelected.has(item.id))
      .map(item => item.id);
    setInsightSelectedItems(inverted);
  },
});