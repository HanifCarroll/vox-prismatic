/**
 * Custom hook for responsive screen size detection
 * Provides clean breakpoint detection for navigation components
 */

import { useEffect, useState } from 'react';

interface ScreenSize {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isMounted: boolean;
}

// Breakpoint constants
const BREAKPOINTS = {
  MOBILE: 680,
  DESKTOP: 1024,
} as const;

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isDesktop: true, // Default to desktop for SSR
    isTablet: false,
    isMobile: false,
    isMounted: false,
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      setScreenSize({
        isDesktop: width >= BREAKPOINTS.DESKTOP,
        isTablet: width >= BREAKPOINTS.MOBILE && width < BREAKPOINTS.DESKTOP,
        isMobile: width < BREAKPOINTS.MOBILE,
        isMounted: true,
      });
    };

    // Initial check
    updateScreenSize();

    // Add event listener
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}