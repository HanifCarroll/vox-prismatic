import { useCallback, useMemo } from "react";

type ContentView = "transcripts" | "insights" | "posts";

interface FilterState {
  transcripts: {
    statusFilter: string;
    sortBy: string;
  };
  insights: {
    statusFilter: string;
    categoryFilter: string;
    postTypeFilter: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
    scoreRange: [number, number];
  };
  posts: {
    statusFilter: string;
    platformFilter: string;
    sortBy: string;
  };
}

interface UseContentFiltersProps {
  activeView: ContentView;
  filters: FilterState;
  dispatch: (action: any) => void;
  setSearchQuery: (query: string) => void;
}

export function useContentFilters({ 
  activeView, 
  filters, 
  dispatch,
  setSearchQuery 
}: UseContentFiltersProps) {
  const handleFilterChange = useCallback((filterKey: string, value: string) => {
    switch (activeView) {
      case 'transcripts':
        if (filterKey === 'status') {
          dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: value });
        } else if (filterKey === 'sort') {
          dispatch({ type: 'SET_TRANSCRIPT_SORT', payload: value });
        }
        break;
      case 'insights':
        if (filterKey === 'status') {
          dispatch({ type: 'SET_INSIGHT_STATUS_FILTER', payload: value });
        } else if (filterKey === 'category') {
          dispatch({ type: 'SET_INSIGHT_CATEGORY_FILTER', payload: value });
        } else if (filterKey === 'sort') {
          const [field, order] = value.split('-');
          dispatch({ type: 'SET_INSIGHT_SORT', payload: { field, order: order as 'asc' | 'desc' } });
        }
        break;
      case 'posts':
        if (filterKey === 'status') {
          dispatch({ type: 'SET_POST_STATUS_FILTER', payload: value });
        } else if (filterKey === 'platform') {
          dispatch({ type: 'SET_POST_PLATFORM_FILTER', payload: value });
        } else if (filterKey === 'sort') {
          dispatch({ type: 'SET_POST_SORT', payload: value });
        }
        break;
    }
  }, [activeView, dispatch]);

  const handleClearAllFilters = useCallback(() => {
    switch (activeView) {
      case 'transcripts':
        dispatch({ type: 'SET_TRANSCRIPT_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_TRANSCRIPT_SORT', payload: 'createdAt-desc' });
        break;
      case 'insights':
        dispatch({ type: 'SET_INSIGHT_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_CATEGORY_FILTER', payload: 'all' });
        dispatch({ type: 'SET_INSIGHT_SORT', payload: { field: 'totalScore', order: 'desc' } });
        break;
      case 'posts':
        dispatch({ type: 'SET_POST_STATUS_FILTER', payload: 'all' });
        dispatch({ type: 'SET_POST_PLATFORM_FILTER', payload: 'all' });
        dispatch({ type: 'SET_POST_SORT', payload: 'createdAt-desc' });
        break;
    }
    setSearchQuery('');
  }, [activeView, dispatch, setSearchQuery]);

  const currentFilters = useMemo(() => {
    switch (activeView) {
      case 'transcripts':
        return {
          status: filters.transcripts.statusFilter,
          sort: filters.transcripts.sortBy,
        };
      case 'insights':
        return {
          status: filters.insights.statusFilter,
          category: filters.insights.categoryFilter,
          sort: `${filters.insights.sortBy}-${filters.insights.sortOrder}`,
        };
      case 'posts':
        return {
          status: filters.posts.statusFilter,
          platform: filters.posts.platformFilter,
          sort: filters.posts.sortBy,
        };
      default:
        return {};
    }
  }, [activeView, filters]);

  return {
    handleFilterChange,
    handleClearAllFilters,
    currentFilters,
  };
}