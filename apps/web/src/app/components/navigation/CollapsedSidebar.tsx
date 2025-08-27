"use client";

/**
 * Collapsed sidebar component (≥680px)
 * Always starts collapsed, expands to overlay on click
 * Works identically on both desktop and tablet
 */

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SidebarCore } from "./SidebarCore";
import type { NavigationProps } from "./types";

export function CollapsedSidebar({ className = "", initialCounts }: NavigationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const expandSidebar = () => setIsExpanded(true);
  const collapseSidebar = () => setIsExpanded(false);

  const handleNavigate = () => {
    // Auto-close sidebar after navigation
    collapseSidebar();
  };

  const toggleButtonElement = (
    <button
      onClick={isExpanded ? collapseSidebar : expandSidebar}
      className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
      title={isExpanded ? "Close menu" : "Open menu"}
    >
      {isExpanded ? (
        <X className="h-5 w-5" />
      ) : (
        <Menu className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <>
      {/* Collapsed Sidebar - Fixed height, always visible */}
      <div className={`sidebar bg-white border-r border-gray-200 w-20 flex-shrink-0 h-full ${className || ''}`}>
        <div className="flex flex-col h-full">
          <SidebarCore
            initialCounts={initialCounts}
            isCollapsed={true}
            toggleButton={toggleButtonElement}
            showHeader={true}
          />
        </div>
      </div>

      {/* Backdrop for overlay */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isExpanded ? "opacity-30 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={collapseSidebar}
      />

      {/* Expanded Overlay */}
      <div
        className={`sidebar bg-white border-r border-gray-200 fixed top-0 h-full z-50 w-64 transition-transform duration-300 ease-in-out`}
        style={{
          transform: isExpanded ? "translateX(0)" : "translateX(-256px)",
          left: 0,
          boxShadow: isExpanded ? "4px 0 24px rgba(0,0,0,0.1)" : "none",
        }}
      >
        <div className="flex flex-col h-full">
          <SidebarCore
            initialCounts={initialCounts}
            isCollapsed={false}
            onNavigate={handleNavigate}
            toggleButton={toggleButtonElement}
            showHeader={true}
          />
        </div>
      </div>
    </>
  );
}