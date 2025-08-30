
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function ContentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Content section error:', error);
  }, [error]);

  // Check for specific error types
  const isNetworkError = error.message?.toLowerCase().includes('network') || 
                        error.message?.toLowerCase().includes('fetch');
  const isAPIError = error.message?.toLowerCase().includes('api') ||
                     error.message?.toLowerCase().includes('failed to');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-orange-100 p-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Content Error
          </h1>
          <p className="text-gray-600">
            {error.message || 'Something went wrong while loading your content.'}
          </p>
        </div>

        {isNetworkError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Please check your internet connection and try again.
            </p>
          </div>
        )}

        {isAPIError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Our servers are experiencing issues. Please try again in a moment.
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
            onClick={() => window.location.href = '/content'}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Back to Content
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          If this problem persists, try refreshing the page or clearing your browser cache.
        </p>
      </div>
    </div>
  );
}