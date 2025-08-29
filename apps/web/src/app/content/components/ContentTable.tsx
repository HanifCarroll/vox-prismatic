"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Star,
  Loader2
} from "lucide-react";
import { DateTimeDisplay } from "@/components/date";
import { useToast } from "@/lib/toast";
import type { 
  ContentView, 
  ContentItem, 
  ViewConfig, 
  ActionConfig,
  STATUS_STYLES,
  CATEGORY_STYLES,
  PLATFORM_STYLES
} from "./views/config";
import { VIEW_CONFIGS, isActionAvailable } from "./views/config";

interface ActiveJob {
  id: string;
  jobId: string;
  type: string;
  entityId: string;
  entityType: ContentView;
  title: string;
  progress: number;
  status: string;
  startTime: Date;
  error?: string;
}

interface ContentTableProps<T extends ContentItem> {
  view: ContentView;
  data: T[];
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (field: string, order: string) => void;
  onItemClick: (id: string) => void;
  onAction: (action: string, item: T) => Promise<void>;
  onBulkAction: (action: string, items: string[]) => Promise<void>;
  isPending: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  activeJobs?: ActiveJob[];
}

export default function ContentTable<T extends ContentItem>({
  view,
  data,
  selectedItems,
  onSelectionChange,
  sortBy,
  sortOrder,
  onSortChange,
  onItemClick,
  onAction,
  onBulkAction,
  isPending,
  pagination,
  onPageChange,
  activeJobs = []
}: ContentTableProps<T>) {
  const router = useRouter();
  const toast = useToast();
  const [isProcessing, startTransition] = useTransition();
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  
  const config = VIEW_CONFIGS[view];
  
  // Helper to check if an item has an active job
  const getActiveJob = useCallback((itemId: string) => {
    return activeJobs.find(job => job.entityId === itemId);
  }, [activeJobs]);
  
  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onSelectionChange(data.map(item => item.id));
    } else {
      onSelectionChange([]);
    }
  }, [data, onSelectionChange]);
  
  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(item => item !== id));
    }
  }, [selectedItems, onSelectionChange]);
  
  const isSelected = useCallback((id: string) => {
    return selectedItems.includes(id);
  }, [selectedItems]);
  
  const isAllSelected = useMemo(() => {
    return data.length > 0 && selectedItems.length === data.length;
  }, [data, selectedItems]);
  
  const isIndeterminate = useMemo(() => {
    return selectedItems.length > 0 && selectedItems.length < data.length;
  }, [data, selectedItems]);
  
  // Sort handler
  const handleSort = useCallback((field: string) => {
    const column = config.columns.find(col => col.key === field);
    if (!column?.sortable) return;
    
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newOrder);
  }, [config.columns, sortBy, sortOrder, onSortChange]);
  
  const getSortIcon = useCallback((field: string) => {
    const column = config.columns.find(col => col.key === field);
    if (!column?.sortable) return null;
    
    if (sortBy !== field) return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  }, [config.columns, sortBy, sortOrder]);
  
  // Action handler
  const handleItemAction = useCallback(async (action: ActionConfig, item: T) => {
    if (action.requireConfirm) {
      const message = action.confirmMessage || `Are you sure you want to ${action.label.toLowerCase()}?`;
      if (!confirm(message)) return;
    }
    
    setProcessingItems(prev => new Set(prev).add(item.id));
    
    startTransition(async () => {
      try {
        await onAction(action.key, item);
      } finally {
        setProcessingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    });
  }, [onAction]);
  
  // Cell renderers
  const renderCell = useCallback((item: T, column: any) => {
    const value = item[column.key as keyof T];
    
    // Custom renderer if provided
    if (column.render) {
      return column.render(item);
    }
    
    // Default renderers by column key
    switch (column.key) {
      case 'status':
        return renderStatusBadge(value as string);
      
      case 'category':
        return renderCategoryBadge(value as string);
      
      case 'platform':
        return renderPlatformBadge(value as string);
      
      case 'score':
        // For insights, score is nested in scores.total
        const scoreValue = (item as any).scores?.total || value;
        return renderScore(scoreValue as number);
      
      case 'wordCount':
        return value ? (value as number).toLocaleString() : '-';
      
      case 'insights':
        const insights = value as any[];
        return insights?.length > 0 ? (
          <Badge variant="outline">{insights.length} insights</Badge>
        ) : '-';
      
      case 'posts':
        const posts = value as any[];
        return posts?.length > 0 ? (
          <Badge variant="outline">{posts.length} posts</Badge>
        ) : '-';
      
      case 'content':
        const content = value as string;
        return (
          <div className="max-w-md truncate">
            {content?.substring(0, 100)}...
          </div>
        );
      
      case 'createdAt':
      case 'updatedAt':
      case 'scheduledFor':
        return value ? <DateTimeDisplay date={value as Date | string} /> : '-';
      
      case 'title':
        return (
          <div className="font-medium">
            {value as string}
          </div>
        );
      
      case 'postType':
        return (
          <Badge variant="secondary">{value as string}</Badge>
        );
      
      default:
        return value?.toString() || '-';
    }
  }, []);
  
  // Badge renderers
  const renderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      raw: 'bg-gray-100 text-gray-700',
      cleaned: 'bg-blue-100 text-blue-700',
      processed: 'bg-green-100 text-green-700',
      needs_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-green-100 text-green-700',
    };
    
    return (
      <Badge className={styles[status] || styles.draft}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };
  
  const renderCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      business: 'bg-blue-100 text-blue-700',
      marketing: 'bg-purple-100 text-purple-700',
      personal: 'bg-pink-100 text-pink-700',
      technology: 'bg-indigo-100 text-indigo-700',
      health: 'bg-green-100 text-green-700',
      finance: 'bg-yellow-100 text-yellow-700',
      education: 'bg-cyan-100 text-cyan-700',
      other: 'bg-gray-100 text-gray-700',
    };
    
    return (
      <Badge variant="outline" className={colors[category] || colors.other}>
        {category}
      </Badge>
    );
  };
  
  const renderPlatformBadge = (platform: string) => {
    const styles: Record<string, string> = {
      linkedin: 'bg-blue-600 text-white',
      twitter: 'bg-black text-white',
      facebook: 'bg-blue-500 text-white',
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    };
    
    return (
      <Badge className={styles[platform] || 'bg-gray-500 text-white'}>
        {platform}
      </Badge>
    );
  };
  
  const renderScore = (score: number) => {
    const color = score >= 15 ? 'text-green-600' : score >= 10 ? 'text-yellow-600' : 'text-gray-600';
    
    return (
      <div className="flex items-center gap-1">
        <Star className={`h-4 w-4 ${color}`} />
        <span className={`font-medium ${color}`}>{score}/20</span>
      </div>
    );
  };
  
  const EmptyIcon = config.emptyIcon;
  
  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white border-b z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected || (isIndeterminate && 'indeterminate' as any)}
                  onCheckedChange={handleSelectAll}
                  disabled={isPending || isProcessing}
                />
              </TableHead>
              {config.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`${column.sortable ? 'cursor-pointer' : ''} ${column.width || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const isItemProcessing = processingItems.has(item.id);
              const isItemSelected = isSelected(item.id);
              const activeJob = getActiveJob(item.id);
              
              return (
                <TableRow 
                  key={item.id}
                  className={`cursor-pointer hover:bg-gray-50 ${isItemSelected ? 'bg-blue-50' : ''} ${isItemProcessing || activeJob ? 'opacity-75' : ''}`}
                  onClick={() => onItemClick(item.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isItemSelected}
                      onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                      disabled={isPending || isProcessing || isItemProcessing || !!activeJob}
                    />
                  </TableCell>
                  {config.columns.map((column) => (
                    <TableCell key={column.key}>
                      <div className="relative">
                        {renderCell(item, column)}
                        {/* Show inline progress indicator for status column */}
                        {column.key === 'status' && activeJob && (
                          <div className="mt-2 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span className="capitalize">{activeJob.type.replace(/_/g, ' ')}</span>
                                <span>{activeJob.progress}%</span>
                              </div>
                              <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all duration-300"
                                  style={{ width: `${activeJob.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isItemProcessing || !!activeJob}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {config.actions.map((action, index) => {
                          if (!isActionAvailable(action, item)) return null;
                          
                          const Icon = action.icon;
                          const isDestructive = action.variant === 'destructive';
                          const showSeparator = index > 0 && isDestructive && 
                            !config.actions[index - 1]?.variant;
                          
                          return (
                            <div key={action.key}>
                              {showSeparator && <DropdownMenuSeparator />}
                              <DropdownMenuItem 
                                onClick={() => handleItemAction(action, item)}
                                className={isDestructive ? 'text-red-600' : ''}
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            </div>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {data.length === 0 && (
          <div className="text-center py-12">
            <EmptyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">{config.emptyTitle}</h3>
            <p className="text-gray-500">{config.emptyMessage}</p>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || isPending || isProcessing}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || isPending || isProcessing}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}