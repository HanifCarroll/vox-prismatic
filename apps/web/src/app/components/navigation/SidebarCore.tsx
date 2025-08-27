"use client";

/**
 * Core sidebar navigation component
 * Contains shared navigation sections, active link detection, and rendering logic
 * Used by both DesktopSidebar and TabletSidebar components
 */

import {
  Calendar,
  Edit3,
  FileText,
  Home,
  Lightbulb,
  Settings,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebarCounts } from "@/app/hooks/useSidebarQueries";
import type { NavSection, SidebarCoreProps } from "./types";

export function SidebarCore({
  initialCounts,
  isCollapsed = false,
  onNavigate,
  getLinkStyles,
  toggleButton,
  showHeader = true,
}: SidebarCoreProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use React Query for sidebar counts with real-time updates
  const { data: queryCounts } = useSidebarCounts();

  // Use query data if available, otherwise fall back to initial counts
  const counts = queryCounts || initialCounts || { transcripts: 0, insights: 0, posts: 0 };

  const navigationSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        {
          id: "dashboard",
          title: "Dashboard",
          icon: Home,
          href: "/",
          description: "System overview and statistics",
        },
      ],
    },
    {
      title: "Content Pipeline",
      items: [
        {
          id: "transcripts",
          title: "Transcripts",
          icon: FileText,
          href: "/content?view=transcripts",
          description: "Manage raw and cleaned transcripts",
          badge: counts.transcripts,
        },
        {
          id: "insights",
          title: "Insights",
          icon: Lightbulb,
          href: "/content?view=insights",
          description: "Review and approve AI insights",
          badge: counts.insights,
        },
        {
          id: "posts",
          title: "Posts",
          icon: Edit3,
          href: "/content?view=posts",
          description: "Manage and edit social media posts",
          badge: counts.posts,
        },
        {
          id: "scheduler",
          title: "Schedule",
          icon: Calendar,
          href: "/scheduler",
          description: "Visual calendar for post scheduling",
        },
      ],
    },
    {
      title: "Configuration",
      items: [
        {
          id: "prompts",
          title: "Prompts",
          icon: Settings,
          href: "/prompts",
          description: "Manage AI prompt templates",
        },
      ],
    },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === href;
    }

    // Handle query parameters for content page
    if (href.startsWith("/content?")) {
      // Extract the view from the href
      const urlParams = new URLSearchParams(href.split("?")[1]);
      const hrefView = urlParams.get("view");

      // Check if we're on the content page
      if (pathname === "/content") {
        // Get the current view from browser URL
        const currentView = searchParams.get("view") || "transcripts";
        return currentView === hrefView;
      }
      return false;
    }

    return pathname.startsWith(href);
  };

  const defaultGetLinkStyles = (href: string) => {
    const baseStyles = isCollapsed
      ? "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group"
      : "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group";

    if (isActiveLink(href)) {
      return `${baseStyles} bg-blue-100 text-blue-700 font-medium`;
    }

    return `${baseStyles} text-gray-700 hover:bg-gray-100 hover:text-gray-900`;
  };

  const linkStylesFunction = getLinkStyles || defaultGetLinkStyles;

  return (
    <>
      {/* Header - only show if showHeader is true */}
      {showHeader && (
        <div className="h-16 px-4 border-b border-gray-200 flex items-center">
          <div className={`flex items-center ${isCollapsed ? "justify-center w-full" : "justify-between w-full"}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="font-bold text-gray-800 text-sm">Content Creation</h1>
                  <p className="text-xs text-gray-500">System v1.0</p>
                </div>
              </div>
            )}
            {toggleButton && (
              <div className={isCollapsed ? "" : ""}>
                {toggleButton}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            )}

            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={linkStylesFunction(item.href)}
                  title={isCollapsed ? item.title : undefined}
                  onClick={onNavigate}
                >
                  <item.icon className={`${isCollapsed ? "h-5 w-5" : "h-5 w-5"} flex-shrink-0`} />

                  {/* Collapsed state: Show full label */}
                  {isCollapsed && (
                    <div className="flex flex-col items-center px-1">
                      <span className="text-[9px] text-center mt-1 leading-tight break-words">
                        {item.title}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="text-[9px] text-red-600 font-bold">
                          ({item.badge})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded state */}
                  {!isCollapsed && (
                    <>
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <div className="bg-red-500 text-white text-[10px] min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full font-bold shadow-sm">
                          {item.badge > 99 ? "99+" : item.badge}
                        </div>
                      )}
                    </>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}