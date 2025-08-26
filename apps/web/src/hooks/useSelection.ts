import { useState, useCallback } from 'react';

export interface SelectionState {
  selectedItems: string[];
  isAllSelected: boolean;
  hasSelection: boolean;
  selectedCount: number;
}

export interface SelectionActions {
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string, selected: boolean) => void;
  selectAll: (itemIds: string[]) => void;
  deselectAll: () => void;
  toggleAll: (itemIds: string[], selected: boolean) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Generic selection management hook for list components
 * Handles single and bulk item selection state
 */
export function useSelection(initialSelection: string[] = []) {
  const [selectedItems, setSelectedItems] = useState<string[]>(initialSelection);

  // Individual item selection
  const select = useCallback((id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  }, []);

  const toggle = useCallback((id: string, selected: boolean) => {
    if (selected) {
      select(id);
    } else {
      deselect(id);
    }
  }, [select, deselect]);

  // Bulk selection
  const selectAll = useCallback((itemIds: string[]) => {
    setSelectedItems(itemIds);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const toggleAll = useCallback((itemIds: string[], selected: boolean) => {
    if (selected) {
      selectAll(itemIds);
    } else {
      deselectAll();
    }
  }, [selectAll, deselectAll]);

  const clear = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Helper functions
  const isSelected = useCallback((id: string) => {
    return selectedItems.includes(id);
  }, [selectedItems]);

  // Computed state
  const hasSelection = selectedItems.length > 0;
  const selectedCount = selectedItems.length;
  
  // For determining if "all" items in a filtered list are selected
  const computeAllSelected = useCallback((itemIds: string[]) => {
    return itemIds.length > 0 && itemIds.every(id => selectedItems.includes(id));
  }, [selectedItems]);

  // Selection state object
  const state: SelectionState = {
    selectedItems,
    isAllSelected: false, // This will be computed by the consumer based on visible items
    hasSelection,
    selectedCount,
  };

  // Selection actions object
  const actions: SelectionActions & { computeAllSelected: (itemIds: string[]) => boolean } = {
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    toggleAll,
    clear,
    isSelected,
    computeAllSelected,
  };

  return { state, actions };
}