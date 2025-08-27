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

  // Show desktop layout during SSR and initial hydration
  // This prevents hydration mismatches
  if (!isMounted) {
    return <CollapsedSidebar className={className} initialCounts={initialCounts} />;
  }

  // Render appropriate navigation based on screen size
  if (isMobile) {
    return <MobileNavbar className={className} initialCounts={initialCounts} />;
  }

  // Desktop and Tablet (≥680px) - both use CollapsedSidebar
  return <CollapsedSidebar className={className} initialCounts={initialCounts} />;
}