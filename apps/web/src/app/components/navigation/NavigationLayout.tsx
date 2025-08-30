
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

  // Always render the same structure to avoid hydration mismatches
  // Use CSS classes to handle responsive behavior instead of conditional rendering
  const layoutClass = isMounted && isMobile 
    ? "h-screen flex flex-col overflow-hidden" 
    : "flex h-screen overflow-hidden";

  return (
    <div className={layoutClass}>
      <Suspense fallback={
        isMounted && isMobile 
          ? <div className="h-14 bg-white border-b" />
          : <div className="w-16 bg-white border-r" />
      }>
        <ResponsiveNavigation className={className} initialCounts={initialCounts} />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}