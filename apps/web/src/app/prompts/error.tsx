'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileWarning, RefreshCw, Home } from 'lucide-react';

export default function PromptsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Prompts error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-3">
            <FileWarning className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Prompts Error
          </h1>
          <p className="text-gray-600">
            {error.message || 'Unable to load prompts. Please try again.'}
          </p>
        </div>

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
            onClick={() => window.location.href = '/prompts'}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Reload Prompts
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Your prompts are safe. If the problem persists, please try again later.
        </p>
      </div>
    </div>
  );
}