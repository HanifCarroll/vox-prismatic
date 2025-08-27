"use client";

/**
 * Responsive navigation container component
 * Conditionally renders appropriate navigation based on screen size
 * Three-tier system: Desktop, Tablet, Mobile
 */

import { useScreenSize } from "./useScreenSize";
import { DesktopSidebar } from "./DesktopSidebar";
import { TabletSidebar } from "./TabletSidebar";
import { MobileNavbar } from "./MobileNavbar";
import type { NavigationProps } from "./types";

export function ResponsiveNavigation({ className, initialCounts }: NavigationProps) {
  const { isDesktop, isTablet, isMobile, isMounted } = useScreenSize();

  // Show desktop layout during SSR and initial hydration
  // This prevents hydration mismatches
  if (!isMounted) {
    return <DesktopSidebar className={className} initialCounts={initialCounts} />;
  }

  // Render appropriate navigation based on screen size
  if (isMobile) {
    return <MobileNavbar className={className} initialCounts={initialCounts} />;
  }

  if (isTablet) {
    return <TabletSidebar className={className} initialCounts={initialCounts} />;
  }

  // Desktop (≥1024px)
  return <DesktopSidebar className={className} initialCounts={initialCounts} />;
}