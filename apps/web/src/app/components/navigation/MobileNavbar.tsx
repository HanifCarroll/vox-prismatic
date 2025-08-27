"use client";

/**
 * Mobile navbar component (<680px)
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
      {/* Top Navbar */}
      <nav className={`bg-white border-b border-gray-200 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-800 text-sm">Content Creation</h1>
              <p className="text-xs text-gray-500">System v1.0</p>
            </div>
          </div>

          {/* Hamburger Menu Button - On the RIGHT */}
          <button
            onClick={openMenu}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Full-Screen Navigation Modal */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeMenu}
          />

          {/* Full-Screen Menu */}
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="font-bold text-gray-800">Content Creation</h1>
                  <p className="text-xs text-gray-500">System v1.0</p>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={closeMenu}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                title="Close navigation menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto">
              <SidebarCore
                initialCounts={initialCounts}
                isCollapsed={false}
                onNavigate={handleNavigate}
                showHeader={false}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}