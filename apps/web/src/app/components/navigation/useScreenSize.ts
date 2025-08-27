/**
 * Custom hook for responsive screen size detection
 * Simplified two-breakpoint system for navigation components
 */

import { useEffect, useState } from 'react';

interface ScreenSize {
  isDesktop: boolean;  // ≥680px (includes tablet) - uses CollapsedSidebar
  isMobile: boolean;   // <680px - uses MobileNavbar
  isMounted: boolean;
}

// Breakpoint constants
const BREAKPOINTS = {
  MOBILE: 680,
} as const;

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isDesktop: true, // Default to desktop for SSR
    isMobile: false,
    isMounted: false,
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      setScreenSize({
        isDesktop: width >= BREAKPOINTS.MOBILE,
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