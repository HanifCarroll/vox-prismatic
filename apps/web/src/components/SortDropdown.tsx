'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ChevronUp, ChevronDown, Clock, Hash, Type, TrendingUp } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  group?: string;
}

interface SortDropdownProps {
  options: SortOption[];
  currentValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortDropdown({ options, currentValue, onChange, className = '' }: SortDropdownProps) {
  // Parse current sort to get field and direction
  const [currentField, currentDirection] = currentValue.split('-');
  
  // Group options by their group property
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || 'Sort By';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, SortOption[]>);
  
  // Get the current option label
  const currentOption = options.find(opt => opt.value === currentValue);
  const displayLabel = currentOption?.label || 'Sort';
  
  // Get the appropriate direction icon
  const DirectionIcon = currentDirection === 'asc' ? ChevronUp : ChevronDown;
  
  // Determine which icon to show based on the field
  const getFieldIcon = (field: string) => {
    if (field.includes('date') || field.includes('created') || field.includes('updated')) {
      return Clock;
    } else if (field.includes('score') || field.includes('count')) {
      return Hash;
    } else if (field.includes('title') || field.includes('name')) {
      return Type;
    } else if (field.includes('total') || field.includes('trend')) {
      return TrendingUp;
    }
    return ArrowUpDown;
  };
  
  const FieldIcon = currentOption?.icon || getFieldIcon(currentField);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`gap-2 h-9 hover:bg-white ${className}`} size="sm">
          <FieldIcon className="h-4 w-4" />
          <span className="text-sm">{displayLabel}</span>
          <DirectionIcon className="h-3.5 w-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {Object.entries(groupedOptions).map(([group, items], groupIndex) => (
          <div key={group}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-gray-500">{group}</DropdownMenuLabel>
            {items.map((option) => {
              const [field, direction] = option.value.split('-');
              const Icon = option.icon || getFieldIcon(field);
              const DirIcon = direction === 'asc' ? ChevronUp : ChevronDown;
              const isActive = option.value === currentValue;
              
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  className={`gap-2 ${isActive ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{option.label}</span>
                  <DirIcon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
        
        {/* Quick toggle for current sort direction */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            onChange(`${currentField}-${newDirection}`);
          }}
          className="gap-2 text-gray-600"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Reverse Order</span>
          <kbd className="ml-auto text-xs bg-gray-100 px-1.5 py-0.5 rounded">R</kbd>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}