"use client";

import { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-optimized action sheet that appears from bottom
 * Replaces dropdown menus on mobile for better touch interaction
 * Uses shadcn/ui Sheet component for accessibility and consistency
 */
export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: MobileActionSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "rounded-t-2xl",
          className
        )}
      >
        <SheetHeader>
          {title ? (
            <SheetTitle>{title}</SheetTitle>
          ) : (
            <VisuallyHidden.Root>
              <SheetTitle>Actions</SheetTitle>
            </VisuallyHidden.Root>
          )}
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <VisuallyHidden.Root>
              <SheetDescription>Select an action from the list below</SheetDescription>
            </VisuallyHidden.Root>
          )}
        </SheetHeader>

        {/* Content */}
        <div className={cn(
          "max-h-[60vh] overflow-y-auto overscroll-contain px-6 pb-6",
          !title && "pt-6"
        )}>
          {children}
        </div>

        {/* Safe area padding for iOS */}
        <div className="pb-safe" />
      </SheetContent>
    </Sheet>
  );
}

interface ActionSheetItemProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

/**
 * Individual action item for mobile action sheet
 * Touch-optimized with larger tap targets
 */
export function ActionSheetItem({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
  disabled = false,
}: ActionSheetItemProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const variantStyles = {
    default: 'text-gray-900 active:bg-gray-100',
    danger: 'text-red-600 active:bg-red-50',
    success: 'text-green-600 active:bg-green-50',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-start gap-4 px-6 py-4 text-left transition-colors",
        "hover:bg-gray-50",
        variantStyles[variant],
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon && (
        <div className={cn(
          "flex-shrink-0 mt-0.5",
          variant === 'danger' && "text-red-600",
          variant === 'success' && "text-green-600",
          variant === 'default' && "text-gray-500"
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className={cn(
          "font-medium",
          variant === 'danger' && "text-red-600",
          variant === 'success' && "text-green-600"
        )}>
          {label}
        </div>
        {description && (
          <div className="text-sm text-gray-500 mt-0.5">
            {description}
          </div>
        )}
      </div>
    </button>
  );
}

interface ActionSheetSeparatorProps {
  className?: string;
}

/**
 * Visual separator between action sheet items
 */
export function ActionSheetSeparator({ className }: ActionSheetSeparatorProps) {
  return <div className={cn("h-px bg-gray-200 mx-6 my-1", className)} />;
}