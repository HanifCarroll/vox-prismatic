
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const SmartTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: "default" | "help" | "action";
  }
>(({ className, sideOffset = 4, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-gray-900 text-gray-50 border border-gray-800",
    help: "bg-blue-50 text-blue-900 border border-blue-200",
    action: "bg-white text-gray-900 border border-gray-200 shadow-lg",
  };

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs font-medium",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
SmartTooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface SmartTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  variant?: "default" | "help" | "action";
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
  disabled?: boolean;
}

export function SmartTooltip({
  children,
  content,
  variant = "default",
  side = "top",
  delayDuration = 200,
  disabled = false,
}: SmartTooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <SmartTooltipContent side={side} variant={variant}>
          {content}
        </SmartTooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}