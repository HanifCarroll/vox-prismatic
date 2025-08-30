
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface BaseCardProps {
  children: ReactNode;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  className?: string;
  selectable?: boolean;
  disabled?: boolean;
}

/**
 * Base card component with consistent styling and selection support
 * Used as foundation for all content cards (transcripts, insights, posts)
 */
export const BaseCard = forwardRef<HTMLDivElement, BaseCardProps>(({
  children,
  selected = false,
  onSelect,
  onClick,
  className,
  selectable = true,
  disabled = false,
}, ref) => {
  const handleCheckboxChange = (checked: boolean) => {
    if (onSelect && !disabled) {
      onSelect(checked);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="checkbox"]') ||
      target.closest('[role="button"]')
    ) {
      return;
    }

    if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-white rounded-lg border shadow-sm transition-all",
        "hover:shadow-md hover:border-gray-300",
        "active:scale-[0.99]", // Touch feedback
        selected && "border-blue-500 bg-blue-50/30",
        disabled && "opacity-60 cursor-not-allowed",
        !disabled && onClick && "cursor-pointer",
        className
      )}
      onClick={handleCardClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-selected={selectable ? selected : undefined}
      aria-disabled={disabled}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div 
          className="absolute top-4 left-4 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={handleCheckboxChange}
            disabled={disabled}
            aria-label="Select item"
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      )}

      {/* Card content with padding adjustment for checkbox */}
      <div className={cn(
        "p-4",
        selectable && "pl-12" // Extra padding when checkbox is present
      )}>
        {children}
      </div>
    </div>
  );
});

BaseCard.displayName = 'BaseCard';