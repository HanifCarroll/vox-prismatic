"use client";

import { useMemo } from "react";
import { Search, Filter, Users, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartSelection } from "@/components/SmartSelection";

type ContentView = "transcripts" | "insights" | "posts";

interface UnifiedActionBarProps {
  activeView: ContentView;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedCount: number;
  totalCount: number;
  filteredCount: number;
  onBulkAction: (action: string) => void;
  children?: React.ReactNode;
  
  // Smart Selection props
  onSelectAll: (selected: boolean) => void;
  onSelectFiltered: () => void;
  onSelectByStatus: (status: string) => void;
  onSelectByPlatform?: (platform: string) => void;
  onInvertSelection: () => void;
  onSelectDateRange: (start: Date, end: Date) => void;
  statuses: string[];
  platforms?: string[];
  platformLabel?: string;
  
  // View-specific action handlers
  onAddTranscript?: () => void;
}

export function UnifiedActionBar({
  activeView,
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  selectedCount,
  totalCount,
  filteredCount,
  onBulkAction,
  children,
  // Smart Selection props
  onSelectAll,
  onSelectFiltered,
  onSelectByStatus,
  onSelectByPlatform,
  onInvertSelection,
  onSelectDateRange,
  statuses,
  platforms,
  platformLabel = "platform",
  // View-specific actions
  onAddTranscript,
}: UnifiedActionBarProps) {
  
  // Memoize bulk actions based on active view
  const bulkActions = useMemo(() => {
    const commonActions = ["select", "archive"];
    
    switch (activeView) {
      case "transcripts":
        return [
          { label: "Clean Selected", value: "clean", icon: "✨" },
          { label: "Process Selected", value: "process", icon: "🎯" },
          ...commonActions.map(action => ({ 
            label: `${action.charAt(0).toUpperCase() + action.slice(1)} Selected`, 
            value: action 
          }))
        ];
      case "insights":
        return [
          { label: "Approve Selected", value: "approve", icon: "✅" },
          { label: "Reject Selected", value: "reject", icon: "❌" },
          { label: "Generate Posts", value: "generate_posts", icon: "📝" },
          ...commonActions.map(action => ({ 
            label: `${action.charAt(0).toUpperCase() + action.slice(1)} Selected`, 
            value: action 
          }))
        ];
      case "posts":
        return [
          { label: "Approve Selected", value: "approve", icon: "✅" },
          { label: "Reject Selected", value: "reject", icon: "❌" },
          { label: "Schedule Selected", value: "schedule", icon: "📅" },
          ...commonActions.map(action => ({ 
            label: `${action.charAt(0).toUpperCase() + action.slice(1)} Selected`, 
            value: action 
          }))
        ];
      default:
        return [];
    }
  }, [activeView]);

  // Memoize view-specific primary actions
  const primaryActions = useMemo(() => {
    switch (activeView) {
      case "transcripts":
        return onAddTranscript ? (
          <Button onClick={onAddTranscript} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transcript
          </Button>
        ) : null;
      case "insights":
        return null; // No primary actions for insights
      case "posts":
        return null; // No primary actions for posts
      default:
        return null;
    }
  }, [activeView, onAddTranscript]);
  
  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Primary Actions */}
        {primaryActions}
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={`Search ${activeView}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Smart Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Smart Select
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <SmartSelection
              totalItems={totalCount}
              selectedCount={selectedCount}
              filteredCount={filteredCount}
              onSelectAll={onSelectAll}
              onSelectFiltered={onSelectFiltered}
              onSelectByStatus={onSelectByStatus}
              onSelectByPlatform={onSelectByPlatform}
              onInvertSelection={onInvertSelection}
              onSelectDateRange={onSelectDateRange}
              statuses={statuses}
              platforms={platforms}
              platformLabel={platformLabel}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filters */}
        <Button
          variant="outline"
          onClick={onToggleFilters}
          className={`gap-2 ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>

        {/* Selection Count & Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">
              {selectedCount} selected
            </span>
            
            {bulkActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2">
                    Bulk Actions
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {bulkActions.map((action) => (
                    <DropdownMenuItem
                      key={action.value}
                      onClick={() => onBulkAction(action.value)}
                      className="gap-2"
                    >
                      {action.icon && <span>{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Custom actions from children */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}