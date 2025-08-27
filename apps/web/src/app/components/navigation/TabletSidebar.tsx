"use client";

/**
 * Tablet sidebar component (680-1023px)
 * Traditional collapsible sidebar, identical behavior to DesktopSidebar
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SidebarCore } from "./SidebarCore";
import type { NavigationProps } from "./types";

export function TabletSidebar({ className = "", initialCounts }: NavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
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