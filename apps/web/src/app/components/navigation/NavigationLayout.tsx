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

  // Show desktop layout during SSR and initial hydration
  // This prevents hydration mismatches
  if (!isMounted) {
    return (
      <div className="flex min-h-screen">
        <ResponsiveNavigation className={className} initialCounts={initialCounts} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Mobile layout: Stack navbar on top, content below
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <ResponsiveNavigation className={className} initialCounts={initialCounts} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop/Tablet layout: Sidebar and content side-by-side
  return (
    <div className="flex min-h-screen">
      <ResponsiveNavigation className={className} initialCounts={initialCounts} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}