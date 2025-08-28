'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateDisplay } from '@/components/date';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { MoreVertical, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Unified status configuration for all content types
export const UNIFIED_STATUS_CONFIG = {
  // Initial states
  raw: { 
    label: 'Raw', 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-500'
  },
  draft: { 
    label: 'Draft', 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-500'
  },
  
  // Review state
  needs_review: { 
    label: 'Needs Review', 
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500'
  },
  
  // Ready states
  cleaned: { 
    label: 'Ready to Process', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-500'
  },
  
  // Scheduled/Published states
  scheduled: { 
    label: 'Scheduled', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  published: { 
    label: 'Published', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500'
  },
  
  // Error/Rejected states
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500'
  },
  failed: { 
    label: 'Failed', 
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500'
  },
  
  // Archive state
  archived: { 
    label: 'Archived', 
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    dotColor: 'bg-gray-400'
  }
} as const;

export type UnifiedStatus = keyof typeof UNIFIED_STATUS_CONFIG;

// Base interfaces for component props
interface ContentCardProps {
  children: ReactNode;
  isSelected?: boolean;
  className?: string;
  onClick?: () => void;
}

interface ContentCardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface ContentCardTitleProps {
  title: string;
  icon?: LucideIcon;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
}

interface ContentCardMetaProps {
  children: ReactNode;
  className?: string;
}

interface ContentCardBadgesProps {
  status: UnifiedStatus;
  badges?: Array<{
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
    icon?: LucideIcon;
    className?: string;
  }>;
  className?: string;
}

interface ContentCardBodyProps {
  children: ReactNode;
  className?: string;
}

interface ContentCardActionsProps {
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    loading?: boolean;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive';
    className?: string;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    loading?: boolean;
    variant?: 'ghost' | 'outline';
  }>;
  menuActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    danger?: boolean;
    disabled?: boolean;
  }>;
  showMenu?: boolean;
  onToggleMenu?: () => void;
  className?: string;
}

interface ContentCardLinkProps {
  href?: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
  className?: string;
}

// Main ContentCard compound component
export function ContentCard({ children, isSelected, className, onClick }: ContentCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-blue-500 ring-opacity-50",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
}

// Header section with consistent padding
ContentCard.Header = function ContentCardHeader({ children, className }: ContentCardHeaderProps) {
  return (
    <CardHeader className={cn("pb-3 px-4 sm:px-6", className)}>
      {children}
    </CardHeader>
  );
};

// Title with optional selection checkbox and icon
ContentCard.Title = function ContentCardTitle({ 
  title, 
  icon: Icon, 
  isSelected, 
  onSelect, 
  className 
}: ContentCardTitleProps) {
  return (
    <div className={cn("flex items-start gap-2 sm:gap-3", className)}>
      {onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
      )}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />}
        <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
          {title}
        </h3>
      </div>
    </div>
  );
};

// Metadata row (dates, counts, etc.)
ContentCard.Meta = function ContentCardMeta({ children, className }: ContentCardMetaProps) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2",
      className
    )}>
      {children}
    </div>
  );
};

// Status and type badges with consistent styling
ContentCard.Badges = function ContentCardBadges({ status, badges = [], className }: ContentCardBadgesProps) {
  const statusConfig = UNIFIED_STATUS_CONFIG[status];
  
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3", className)}>
      {/* Status badge with dot indicator */}
      <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
        <span 
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5",
            statusConfig.dotColor
          )} 
        />
        {statusConfig.label}
      </Badge>
      
      {/* Additional badges */}
      {badges.map((badge, index) => {
        const BadgeIcon = badge.icon;
        return (
          <Badge 
            key={index}
            variant={badge.variant || "outline"}
            className={cn("text-xs", badge.className)}
          >
            {BadgeIcon && <BadgeIcon className="h-3 w-3 mr-1" />}
            {badge.label}
          </Badge>
        );
      })}
    </div>
  );
};

// Body content area
ContentCard.Body = function ContentCardBody({ children, className }: ContentCardBodyProps) {
  return (
    <CardContent className={cn("px-4 sm:px-6 pb-3", className)}>
      {children}
    </CardContent>
  );
};

// Action buttons footer
ContentCard.Actions = function ContentCardActions({ 
  primaryAction,
  secondaryActions = [],
  menuActions = [],
  showMenu,
  onToggleMenu,
  className
}: ContentCardActionsProps) {
  return (
    <CardFooter className={cn("px-4 sm:px-6 pb-4 pt-0", className)}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {/* Primary action button */}
          {primaryAction && (
            <Button
              variant={primaryAction.variant || "default"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                primaryAction.onClick();
              }}
              disabled={primaryAction.loading}
              className={primaryAction.className}
            >
              {primaryAction.loading ? (
                <ButtonSpinner />
              ) : primaryAction.icon ? (
                <primaryAction.icon className="h-4 w-4 mr-1.5" />
              ) : null}
              {primaryAction.label}
            </Button>
          )}
          
          {/* Secondary action buttons */}
          {secondaryActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant || "ghost"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                disabled={action.loading}
              >
                {action.loading ? (
                  <ButtonSpinner />
                ) : ActionIcon ? (
                  <ActionIcon className="h-4 w-4" />
                ) : null}
                <span className="hidden sm:inline ml-1.5">{action.label}</span>
              </Button>
            );
          })}
        </div>
        
        {/* Menu button */}
        {menuActions.length > 0 && onToggleMenu && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {/* Dropdown menu - implement with your existing ActionMenu component */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                {menuActions.map((action, index) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={index}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2",
                        action.danger && "text-red-600 hover:bg-red-50",
                        action.disabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!action.disabled) {
                          action.onClick();
                          onToggleMenu();
                        }
                      }}
                      disabled={action.disabled}
                    >
                      {ActionIcon && <ActionIcon className="h-4 w-4" />}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </CardFooter>
  );
};

// Link to related content
ContentCard.Link = function ContentCardLink({ href, label, count, icon: Icon, className }: ContentCardLinkProps) {
  const content = (
    <div className={cn(
      "flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 cursor-pointer",
      className
    )}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {count}
        </Badge>
      )}
      <ChevronRight className="h-3.5 w-3.5" />
    </div>
  );
  
  if (href) {
    return (
      <a href={href} onClick={(e) => e.stopPropagation()}>
        {content}
      </a>
    );
  }
  
  return content;
};

// Export additional utilities
export { DateDisplay };