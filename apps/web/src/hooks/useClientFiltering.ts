import { useState, useMemo, useCallback } from 'react';

export interface BaseFilterableItem {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: string | number | boolean | Date | undefined;
}

export interface FilterState {
  activeStatusFilter: string;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterActions {
  setActiveStatusFilter: (status: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;
  clearFilters: () => void;
}

export interface FilterOptions<T> {
  searchFields: (keyof T)[];
  statusField?: keyof T;
  additionalFilters?: Record<string, any>;
  scoreField?: keyof T;
  scoreRange?: [number, number];
  customSortFields?: Record<string, (item: T) => any>;
}

/**
 * Generic client-side filtering hook for list components
 * Handles search, status filtering, sorting, and custom filters
 */
export function useClientFiltering<T extends BaseFilterableItem>(
  items: T[],
  initialFilter: string = 'all',
  options: FilterOptions<T>
) {
  // Filter state
  const [activeStatusFilter, setActiveStatusFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Additional filter states (for insights - score range, post type, category)
  const [additionalFilters, setAdditionalFilters] = useState<Record<string, any>>({});

  // Filter actions
  const setSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveStatusFilter('all');
    setSearchQuery('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setAdditionalFilters({});
  }, []);

  const setAdditionalFilter = useCallback((key: string, value: string | number | boolean | Date | undefined) => {
    setAdditionalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Status filtering
    if (activeStatusFilter !== 'all') {
      const statusField = options.statusField || 'status';
      filtered = filtered.filter(item => item[statusField] === activeStatusFilter);
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        return options.searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(query);
        });
      });
    }

    // Additional filters (category, post type, etc.)
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => item[key] === value);
      }
    });

    // Score range filtering (for insights)
    if (options.scoreField && options.scoreRange) {
      const [minScore, maxScore] = options.scoreRange;
      if (minScore > 0 || maxScore < 20) {
        filtered = filtered.filter(item => {
          const score = item[options.scoreField!] as number;
          return typeof score === 'number' && score >= minScore && score <= maxScore;
        });
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: string | number | boolean | Date | undefined;
      let bVal: string | number | boolean | Date | undefined;

      // Handle custom sort fields
      if (options.customSortFields?.[sortBy]) {
        aVal = options.customSortFields[sortBy](a);
        bVal = options.customSortFields[sortBy](b);
      } else if (sortBy.includes('.')) {
        // Handle nested field sorting (e.g., 'scores.total')
        const fields = sortBy.split('.');
        aVal = fields.reduce((obj: any, field) => obj?.[field], a as any);
        bVal = fields.reduce((obj: any, field) => obj?.[field], b as any);
      } else {
        aVal = a[sortBy as keyof T];
        bVal = b[sortBy as keyof T];
      }

      // Handle date sorting
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? -Infinity : Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? -Infinity : Infinity;

      // Compare values
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [
    items,
    activeStatusFilter,
    searchQuery,
    sortBy,
    sortOrder,
    additionalFilters,
    options.statusField,
    options.searchFields,
    options.scoreField,
    options.scoreRange,
    options.customSortFields
  ]);

  // Filter state object
  const filters: FilterState = {
    activeStatusFilter,
    searchQuery,
    sortBy,
    sortOrder,
  };

  // Filter actions object
  const actions: FilterActions & { setAdditionalFilter: (key: string, value: string | number | boolean | Date | undefined) => void } = {
    setActiveStatusFilter,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setSort,
    clearFilters,
    setAdditionalFilter,
  };

  return {
    filteredItems,
    filters: { ...filters, ...additionalFilters },
    actions,
    itemCount: {
      total: items.length,
      filtered: filteredItems.length,
    }
  };
}