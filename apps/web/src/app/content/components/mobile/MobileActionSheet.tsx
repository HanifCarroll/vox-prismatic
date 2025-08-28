"use client";

import { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-optimized action sheet that appears from bottom
 * Replaces dropdown menus on mobile for better touch interaction
 */
export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: MobileActionSheetProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "duration-300",
            className
          )}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {title}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          )}

          {/* Content */}
          <div className={cn(
            "max-h-[60vh] overflow-y-auto overscroll-contain",
            !title && "pt-6"
          )}>
            {children}
          </div>

          {/* Safe area padding for iOS */}
          <div className="pb-safe" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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