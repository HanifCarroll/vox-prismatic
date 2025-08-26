import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { BreadcrumbItem } from '@/components/Breadcrumbs';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/transcripts': 'Transcripts',
  '/insights': 'Insights',
  '/posts': 'Posts',
  '/scheduler': 'Scheduler',
  '/prompts': 'Prompts'
};

export function useBreadcrumbs(itemTitle?: string) {
  const pathname = usePathname();
  
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    
    // Build breadcrumb path
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Get label from route labels or capitalize segment
      const label = routeLabels[currentPath] || 
        segment.charAt(0).toUpperCase() + segment.slice(1);
      
      items.push({
        label,
        href: currentPath,
        current: isLast && !itemTitle
      });
    });
    
    // Add item title if provided (for detail views)
    if (itemTitle) {
      items.push({
        label: itemTitle,
        href: pathname,
        current: true
      });
    }
    
    return items;
  }, [pathname, itemTitle]);
  
  return breadcrumbs;
}