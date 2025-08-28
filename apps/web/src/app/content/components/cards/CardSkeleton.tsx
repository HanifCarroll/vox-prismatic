"use client";

import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Skeleton loading state for card components
 * Provides shimmer animation and maintains card dimensions
 */
export function CardSkeleton({ className, count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "relative bg-white rounded-lg border shadow-sm p-4",
            "animate-pulse",
            className
          )}
        >
          <div className="space-y-3">
            {/* Header: Platform/Type badge and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="h-6 w-20 bg-gray-200 rounded" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 bg-gray-200 rounded" />
                <div className="h-8 w-8 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Title skeleton */}
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-gray-200 rounded" />
              <div className="h-5 w-1/2 bg-gray-200 rounded" />
            </div>

            {/* Content skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
            </div>

            {/* Metadata skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-3 w-3 bg-gray-200 rounded-full" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>

            {/* Action buttons skeleton (conditional) */}
            {Math.random() > 0.5 && (
              <div className="flex gap-2 pt-2">
                <div className="h-8 flex-1 bg-gray-200 rounded" />
                <div className="h-8 flex-1 bg-gray-200 rounded" />
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Grid skeleton for loading multiple cards
 * Responsive layout matching CardList component
 */
export function CardGridSkeleton({ 
  count = 6,
  className 
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-1", // Back to single column on desktop (table view)
      className
    )}>
      <CardSkeleton count={count} />
    </div>
  );
}