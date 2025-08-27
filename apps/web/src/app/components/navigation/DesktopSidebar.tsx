"use client";

/**
 * Desktop sidebar component (≥1024px)
 * Simple collapsible sidebar with traditional desktop UX
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SidebarCore } from "./SidebarCore";
import type { NavigationProps } from "./types";

export function DesktopSidebar({ className = "", initialCounts }: NavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getLinkStyles = (href: string, isActive: boolean) => {
    const baseStyles = isCollapsed
      ? "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group"
      : "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group";

    if (isActive) {
      return `${baseStyles} bg-blue-100 text-blue-700 font-medium`;
    }

    return `${baseStyles} text-gray-700 hover:bg-gray-100 hover:text-gray-900`;
  };

  const toggleButtonElement = (
    <button
      onClick={toggleSidebar}
      className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? (
        <ChevronRight className="h-5 w-5" />
      ) : (
        <ChevronLeft className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <div
      className={`sidebar bg-white border-r border-gray-200 ${className} ${
        isCollapsed
          ? "w-20 flex-shrink-0 transition-all duration-300"
          : "w-64 flex-shrink-0 transition-all duration-300"
      }`}
    >
      <div className="flex flex-col h-full">
        <SidebarCore
          initialCounts={initialCounts}
          isCollapsed={isCollapsed}
          toggleButton={toggleButtonElement}
        />
      </div>
    </div>
  );
}