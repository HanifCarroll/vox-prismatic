"use client";

/**
 * Navigation layout wrapper component
 * Handles different layout structures for mobile vs desktop/tablet navigation
 */

import { Suspense } from "react";
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
      <div className="h-screen flex flex-col overflow-hidden">
        <Suspense fallback={<div className="h-14 bg-white border-b" />}>
          <ResponsiveNavigation className={className} initialCounts={initialCounts} />
        </Suspense>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop/Tablet layout: Fixed sidebar with scrollable content area
  // Use same layout for SSR and client to prevent hydration mismatches
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="w-16 bg-white border-r" />}>
        <ResponsiveNavigation className={className} initialCounts={initialCounts} />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}