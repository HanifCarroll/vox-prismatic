"use client";

/**
 * Navigation layout wrapper component
 * Handles different layout structures for mobile vs desktop/tablet navigation
 */

import { useScreenSize } from "./useScreenSize";
import { ResponsiveNavigation } from "./ResponsiveNavigation";
import type { NavigationProps } from "./types";

interface NavigationLayoutProps extends NavigationProps {
  children: React.ReactNode;
}

export function NavigationLayout({ children, className, initialCounts }: NavigationLayoutProps) {
  const { isMobile, isMounted } = useScreenSize();

  // Mobile layout: Stack navbar on top, content below
  if (isMounted && isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <ResponsiveNavigation className={className} initialCounts={initialCounts} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop/Tablet layout: Fixed sidebar with scrollable content area
  // Use same layout for SSR and client to prevent hydration mismatches
  return (
    <div className="flex h-screen overflow-hidden">
      <ResponsiveNavigation className={className} initialCounts={initialCounts} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}