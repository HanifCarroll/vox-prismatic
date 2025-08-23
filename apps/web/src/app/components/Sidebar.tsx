'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar navigation component
 * Main navigation for the content creation system
 */

interface NavItem {
  id: string;
  title: string;
  icon: string;
  href: string;
  description: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navigationSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          icon: '🏠',
          href: '/',
          description: 'System overview and statistics'
        }
      ]
    },
    {
      title: 'Content Pipeline',
      items: [
        {
          id: 'transcripts',
          title: 'Transcripts',
          icon: '📄',
          href: '/transcripts',
          description: 'Manage raw and cleaned transcripts'
        },
        {
          id: 'insights',
          title: 'Insights',
          icon: '💡',
          href: '/insights',
          description: 'Review and approve AI insights',
          badge: 15 // TODO: Get from API
        },
        {
          id: 'posts',
          title: 'Posts',
          icon: '📝',
          href: '/posts',
          description: 'Manage and edit social media posts',
          badge: 8 // TODO: Get from API
        },
        {
          id: 'scheduler',
          title: 'Scheduler',
          icon: '📅',
          href: '/scheduler',
          description: 'Visual calendar for post scheduling'
        }
      ]
    },
    {
      title: 'Analytics',
      items: [
        {
          id: 'analytics',
          title: 'Analytics',
          icon: '📈',
          href: '/analytics',
          description: 'Performance and review statistics'
        }
      ]
    },
    {
      title: 'System',
      items: [
        {
          id: 'settings',
          title: 'Settings',
          icon: '⚙️',
          href: '/settings',
          description: 'System configuration and preferences'
        }
      ]
    }
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getLinkStyles = (href: string) => {
    const baseStyles = 'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group';
    
    if (isActiveLink(href)) {
      return `${baseStyles} bg-blue-100 text-blue-700 font-medium`;
    }
    
    return `${baseStyles} text-gray-700 hover:bg-gray-100 hover:text-gray-900`;
  };

  return (
    <div className={`sidebar bg-white border-r border-gray-200 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎯</div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-gray-800">Content Creation</h1>
                  <p className="text-xs text-gray-500">System v1.0</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>

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
                    className={getLinkStyles(item.href)}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className="text-lg">{item.icon}</div>
                    
                    {!isCollapsed && (
                      <>
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                        </div>
                        
                        {item.badge && item.badge > 0 && (
                          <div className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                            {item.badge}
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {!isCollapsed && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 mb-1">
                💡 Quick Tip
              </div>
              <div className="text-xs text-blue-600">
                Use the pipeline overview to quickly navigate between workflow stages
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}