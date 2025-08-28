import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'table' | 'card' | 'auto';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface UseResponsiveViewOptions {
  defaultMode?: ViewMode;
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  storageKey?: string;
}

interface UseResponsiveViewReturn {
  viewMode: ViewMode;
  effectiveView: 'table' | 'card';
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleView: () => void;
}

/**
 * Hook to manage responsive view modes (table/card) based on device type
 * Automatically switches to card view on mobile, allows manual toggle on tablet
 */
export function useResponsiveView({
  defaultMode = 'auto',
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024,
  storageKey = 'content-view-mode',
}: UseResponsiveViewOptions = {}): UseResponsiveViewReturn {
  // Initialize from localStorage or default
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    
    const stored = localStorage.getItem(storageKey);
    if (stored && ['table', 'card', 'auto'].includes(stored)) {
      return stored as ViewMode;
    }
    return defaultMode;
  });

  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window === 'undefined') return tabletBreakpoint + 1;
    return window.innerWidth;
  });

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Add resize listener with debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Determine device type
  const deviceType: DeviceType = windowWidth < mobileBreakpoint 
    ? 'mobile' 
    : windowWidth < tabletBreakpoint 
    ? 'tablet' 
    : 'desktop';

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  // Determine effective view based on mode and device
  const effectiveView: 'table' | 'card' = viewMode === 'auto'
    ? (isMobile ? 'card' : 'table')
    : viewMode;

  // Set view mode and persist to localStorage
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  }, [storageKey]);

  // Toggle between table and card views
  const toggleView = useCallback(() => {
    const newMode: ViewMode = effectiveView === 'table' ? 'card' : 'table';
    setViewMode(newMode);
  }, [effectiveView, setViewMode]);

  return {
    viewMode,
    effectiveView,
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    setViewMode,
    toggleView,
  };
}