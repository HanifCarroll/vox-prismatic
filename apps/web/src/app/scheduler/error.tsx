'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarX, RefreshCw, Home } from 'lucide-react';

export default function SchedulerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Scheduler error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-purple-100 p-3">
            <CalendarX className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Scheduler Error
          </h1>
          <p className="text-gray-600">
            {error.message || 'Unable to load the scheduler. Please try again.'}
          </p>
        </div>

        {error.message?.includes('scheduled') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              There was an issue with your scheduled posts. Your content is safe and you can try again.
            </p>
          </div>
        )}

        {error.digest && (
          <p className="text-xs text-gray-400">
            Error reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={reset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/scheduler'}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Reload Scheduler
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Your scheduled posts are safe. If the problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}