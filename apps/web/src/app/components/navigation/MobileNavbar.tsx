"use client";

/**
 * Mobile navbar component (<768px)
 * Top navbar with hamburger menu on the right and full-screen modal navigation
 */

import { Menu, Target, X } from "lucide-react";
import { useState } from "react";
import { SidebarCore } from "./SidebarCore";
import type { NavigationProps } from "./types";

export function MobileNavbar({ className = "", initialCounts }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = () => setIsMenuOpen(true);
  const closeMenu = () => setIsMenuOpen(false);

  const handleNavigate = () => {
    // Auto-close menu after navigation on mobile
    closeMenu();
  };

  return (
    <>
      {/* Top Navbar - Always visible and static */}
      <nav className={`bg-white border-b border-gray-200 relative z-50 ${className}`}>
        <div className="h-16 flex items-center justify-between px-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-800 text-sm">Content Creation</h1>
              <p className="text-xs text-gray-500">System v1.0</p>
            </div>
          </div>

          {/* Toggle Button - Changes between Menu and X */}
          <button
            onClick={isMenuOpen ? closeMenu : openMenu}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Navigation Dropdown with Smooth Animation */}
      <>
        {/* Backdrop with fade animation */}
        <div
          className={`fixed inset-0 bg-black z-30 transition-opacity duration-300 ease-in-out ${
            isMenuOpen 
              ? "opacity-50 pointer-events-auto" 
              : "opacity-0 pointer-events-none"
          }`}
          style={{ top: '64px' }} // Start below the header
          onClick={closeMenu}
        />

        {/* Menu Content - Slides down from beneath header */}
        <div 
          className={`fixed inset-x-0 bg-white z-40 transition-transform duration-300 ease-in-out ${
            isMenuOpen 
              ? "translate-y-0" 
              : "-translate-y-full"
          }`}
          style={{
            top: '64px', // Position below the header (h-16 = 64px)
            height: 'calc(100vh - 64px)', // Full height minus header
            boxShadow: isMenuOpen ? '0 4px 24px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          {/* Navigation Content */}
          <div className="flex-1 overflow-y-auto h-full">
            <SidebarCore
              initialCounts={initialCounts}
              isCollapsed={false}
              onNavigate={handleNavigate}
              showHeader={false}
            />
          </div>
        </div>
      </>
    </>
  );
}