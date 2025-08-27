"use client";

/**
 * Responsive navigation container component
 * Simplified two-tier system: Desktop/Tablet vs Mobile
 */

import { useScreenSize } from "./useScreenSize";
import { CollapsedSidebar } from "./CollapsedSidebar";
import { MobileNavbar } from "./MobileNavbar";
import type { NavigationProps } from "./types";

export function ResponsiveNavigation({ className, initialCounts }: NavigationProps) {
  const { isDesktop, isMobile, isMounted } = useScreenSize();

  // Render appropriate navigation based on screen size
  // For SSR, default to desktop layout
  if (isMounted && isMobile) {
    return <MobileNavbar className={className} initialCounts={initialCounts} />;
  }

  // Desktop and Tablet (≥768px) - both use CollapsedSidebar
  // Also used during SSR to prevent hydration mismatches
  return <CollapsedSidebar className={className} initialCounts={initialCounts} />;
}