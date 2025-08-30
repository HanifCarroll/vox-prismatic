"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";

interface ActionableItem {
  id: string;
  actionType: string;
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  context?: string;
  platform?: string;
  actionUrl: string;
  actionLabel: string;
  timestamp: string;
  count?: number;
}

interface ActionableData {
  urgent: ActionableItem[];
  needsReview: ActionableItem[];
  readyToProcess: ActionableItem[];
  totalCount: number;
}

const priorityConfig = {
  urgent: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconBg: "bg-red-100",
  },
  high: {
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    iconBg: "bg-orange-100",
  },
  medium: {
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconBg: "bg-blue-100",
  },
  low: {
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    iconBg: "bg-gray-100",
  },
};

// Separate component to handle hooks properly
function ActionItem({ 
  item, 
  dismissed, 
  onDismiss 
}: { 
  item: ActionableItem; 
  dismissed: boolean;
  onDismiss: (id: string) => void;
}) {
  // Hook is now called at the component level, not in a loop
  const actionPrefetch = usePrefetchOnHover(item.actionUrl, {
    delay: 100,
    respectConnection: true,
  });

  if (dismissed) return null;

  const config = priorityConfig[item.priority];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.iconBg} rounded-full p-2 flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-medium ${config.color} mb-1`}>
                {item.title}
              </h4>
              {item.context && (
                <p className="text-sm text-gray-600 mb-2">{item.context}</p>
              )}
              {item.platform && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {item.platform}
                </span>
              )}
            </div>

            <button
              onClick={() => onDismiss(item.id)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3">
            <Link href={item.actionUrl} {...actionPrefetch}>
              <Button
                size="sm"
                className={`gap-1 ${
                  item.priority === "urgent"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {item.actionLabel}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionCenter({ className = "" }: { className?: string }) {
  const [data, setData] = useState<ActionableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const toast = useToast();

  const fetchActionableItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.dashboard.getActionableItems();

      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error("Failed to fetch actionable items");
      }
    } catch (err) {
      console.error("Error fetching actionable items:", err);
      setError("Failed to load action items");
      toast.error("Failed to load action items", {
        description: "Please try refreshing the page"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActionableItems();
    // Refresh every 2 minutes
    const interval = setInterval(fetchActionableItems, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (itemId: string) => {
    setDismissed((prev) => new Set([...prev, itemId]));
  };

  if (loading && !data) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className={`${className} p-4 bg-red-50 border border-red-200 rounded-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <Button
            onClick={fetchActionableItems}
            size="sm"
            variant="outline"
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <div
        className={`${className} p-6 bg-green-50 border border-green-200 rounded-lg`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">All caught up!</p>
            <p className="text-sm text-green-700">
              No immediate actions required
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Urgent Items */}
      {data.urgent.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Requires Immediate Attention
          </h3>
          <div className="space-y-3">
            {data.urgent.map((item) => (
              <ActionItem
                key={item.id}
                item={item}
                dismissed={dismissed.has(item.id)}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Needs Review Items */}
      {data.needsReview.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-orange-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Needs Review
          </h3>
          <div className="space-y-3">
            {data.needsReview.map((item) => (
              <ActionItem
                key={item.id}
                item={item}
                dismissed={dismissed.has(item.id)}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ready to Process Items */}
      {data.readyToProcess.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Ready to Process
          </h3>
          <div className="space-y-3">
            {data.readyToProcess.map((item) => (
              <ActionItem
                key={item.id}
                item={item}
                dismissed={dismissed.has(item.id)}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Refresh indicator */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={fetchActionableItems}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
