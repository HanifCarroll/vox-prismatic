import { useState, useEffect, useMemo } from 'react';

export type DataStrategy = 'client' | 'server' | 'hybrid';

interface HybridDataStrategyOptions {
  totalItems: number;
  viewportWidth?: number;
  isTablet?: boolean;
  isMobile?: boolean;
  forceStrategy?: DataStrategy;
  thresholds?: {
    mobile: number;    // Max items for client-side on mobile
    tablet: number;    // Max items for client-side on tablet  
    desktop: number;   // Max items for client-side on desktop
  };
}

interface HybridDataStrategyResult {
  strategy: DataStrategy;
  shouldPaginate: boolean;
  shouldUseServerFilters: boolean;
  shouldUseVirtualScroll: boolean;
  pageSize: number;
  prefetchPages: number;
  cacheTime: number;
}

/**
 * Determines optimal data loading strategy based on device capabilities
 * and dataset size to balance performance with user experience
 */
export function useHybridDataStrategy({
  totalItems,
  viewportWidth,
  isTablet,
  isMobile,
  forceStrategy,
  thresholds = {
    mobile: 50,    // Mobile: server-side for >50 items
    tablet: 100,   // Tablet: server-side for >100 items
    desktop: 500,  // Desktop: server-side for >500 items
  },
}: HybridDataStrategyOptions): HybridDataStrategyResult {
  
  // Detect device type if not provided
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const determineDevice = () => {
      const width = viewportWidth || window.innerWidth;
      
      if (isMobile || width < 768) {
        setDeviceType('mobile');
      } else if (isTablet || width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    
    determineDevice();
    
    if (!viewportWidth) {
      window.addEventListener('resize', determineDevice);
      return () => window.removeEventListener('resize', determineDevice);
    }
  }, [viewportWidth, isMobile, isTablet]);
  
  // Determine strategy based on device and data size
  const strategy = useMemo<DataStrategy>(() => {
    // Allow forced strategy for testing
    if (forceStrategy) {
      return forceStrategy;
    }
    
    // No items or very few items: always client-side
    if (totalItems <= 20) {
      return 'client';
    }
    
    // Determine based on device thresholds
    const threshold = thresholds[deviceType];
    
    if (totalItems <= threshold) {
      return 'client';  // Small dataset: client-side filtering
    }
    
    // For large datasets on mobile/tablet: pure server-side
    if (deviceType !== 'desktop' && totalItems > threshold * 2) {
      return 'server';
    }
    
    // Hybrid: initial server load with client-side filtering on cached data
    return 'hybrid';
  }, [totalItems, deviceType, forceStrategy, thresholds]);
  
  // Calculate optimal page size based on device
  const pageSize = useMemo(() => {
    switch (deviceType) {
      case 'mobile':
        return strategy === 'client' ? 100 : 20;
      case 'tablet':
        return strategy === 'client' ? 200 : 50;
      case 'desktop':
        return strategy === 'client' ? 500 : 100;
    }
  }, [deviceType, strategy]);
  
  // Determine if pagination is needed
  const shouldPaginate = useMemo(() => {
    if (strategy === 'server') return true;
    if (strategy === 'hybrid') return totalItems > pageSize;
    return false; // Client-side doesn't paginate
  }, [strategy, totalItems, pageSize]);
  
  // Should use server-side filters
  const shouldUseServerFilters = strategy !== 'client';
  
  // Virtual scroll for large client-side datasets
  const shouldUseVirtualScroll = useMemo(() => {
    if (deviceType === 'desktop') return false; // Tables don't need it
    if (strategy === 'client') return totalItems > 50;
    return totalItems > pageSize; // For paginated data
  }, [strategy, totalItems, pageSize, deviceType]);
  
  // Prefetch strategy
  const prefetchPages = useMemo(() => {
    if (strategy === 'client') return 0; // No prefetch needed
    if (deviceType === 'mobile') return 1; // Prefetch next page only
    return 2; // Prefetch next 2 pages on desktop/tablet
  }, [strategy, deviceType]);
  
  // Cache time based on strategy
  const cacheTime = useMemo(() => {
    switch (strategy) {
      case 'client':
        return 10 * 60 * 1000; // 10 minutes for client-side
      case 'hybrid':
        return 5 * 60 * 1000;  // 5 minutes for hybrid
      case 'server':
        return 2 * 60 * 1000;  // 2 minutes for server-side
    }
  }, [strategy]);
  
  return {
    strategy,
    shouldPaginate,
    shouldUseServerFilters,
    shouldUseVirtualScroll,
    pageSize,
    prefetchPages,
    cacheTime,
  };
}

/**
 * Hook to track data loading performance metrics
 */
export function useDataLoadingMetrics() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    filterTime: 0,
    renderTime: 0,
    totalTime: 0,
  });
  
  const startTracking = () => {
    const startTime = performance.now();
    
    return {
      trackLoad: () => {
        const loadTime = performance.now() - startTime;
        setMetrics(prev => ({ ...prev, loadTime }));
      },
      trackFilter: () => {
        const filterTime = performance.now() - startTime;
        setMetrics(prev => ({ ...prev, filterTime }));
      },
      trackRender: () => {
        const renderTime = performance.now() - startTime;
        setMetrics(prev => ({ 
          ...prev, 
          renderTime,
          totalTime: renderTime,
        }));
      },
    };
  };
  
  return {
    metrics,
    startTracking,
  };
}