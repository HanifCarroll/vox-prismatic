/**
 * Shared types and interfaces for navigation components
 */

import type { SidebarCounts } from "@/types";

export interface NavItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description: string;
  badge?: number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavigationProps {
  className?: string;
  initialCounts?: SidebarCounts;
}

export interface SidebarCoreProps extends NavigationProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
  getLinkStyles?: (href: string) => string;
  toggleButton?: React.ReactNode;
  showHeader?: boolean;
}