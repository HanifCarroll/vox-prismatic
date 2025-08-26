import React from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Info, AlertTriangle, Calendar, Trash2, Save } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const showToast = (
    type: ToastType,
    message: string,
    options?: ToastOptions
  ) => {
    const config = {
      duration: options?.duration || getDefaultDuration(type),
      description: options?.description,
      action: options?.action,
    };

    switch (type) {
      case "success":
        return toast.success(message, {
          ...config,
          icon: <CheckCircle className="w-4 h-4" />,
        });
      case "error":
        return toast.error(message, {
          ...config,
          duration: options?.duration || 6000, // Longer for errors
          icon: <XCircle className="w-4 h-4" />,
        });
      case "info":
        return toast.info(message, {
          ...config,
          icon: <Info className="w-4 h-4" />,
        });
      case "warning":
        return toast.warning(message, {
          ...config,
          duration: options?.duration || 5000,
          icon: <AlertTriangle className="w-4 h-4" />,
        });
    }
  };

  return {
    success: (message: string, options?: ToastOptions) =>
      showToast("success", message, options),
    error: (message: string, options?: ToastOptions) =>
      showToast("error", message, options),
    info: (message: string, options?: ToastOptions) =>
      showToast("info", message, options),
    warning: (message: string, options?: ToastOptions) =>
      showToast("warning", message, options),
    
    // Specialized toast methods for common use cases
    scheduled: (dateTime: string, platform?: string) => {
      const platformText = platform ? ` on ${platform}` : "";
      return toast.success(`Post scheduled${platformText}`, {
        description: `Will be published on ${dateTime}`,
        icon: <Calendar className="w-4 h-4" />,
      });
    },
    
    deleted: (itemType: string, count = 1) => {
      const message = count === 1 
        ? `Successfully deleted ${itemType}`
        : `Successfully deleted ${count} ${itemType}s`;
      return toast.success(message, {
        icon: <Trash2 className="w-4 h-4" />,
      });
    },
    
    saved: (itemType?: string) => {
      const message = itemType ? `${itemType} saved successfully` : "Changes saved successfully";
      return toast.success(message, {
        icon: <Save className="w-4 h-4" />,
      });
    },
    
    generated: (itemType: string, count: number) => {
      const message = count === 1 
        ? `Generated 1 ${itemType}`
        : `Generated ${count} ${itemType}s`;
      return toast.success(message, {
        duration: 5000, // Longer for generation feedback
      });
    },
    
    apiError: (operation: string, error?: string) => {
      const message = `Failed to ${operation}`;
      return toast.error(message, {
        description: error || "Please try again later",
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      });
    },
  };
};

function getDefaultDuration(type: ToastType): number {
  switch (type) {
    case "success":
      return 4000;
    case "error":
      return 6000;
    case "info":
      return 4000;
    case "warning":
      return 5000;
    default:
      return 4000;
  }
}