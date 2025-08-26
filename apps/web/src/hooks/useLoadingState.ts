import { useState, useCallback } from 'react';

interface UseLoadingStateOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      options.onSuccess?.();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    withLoading,
    reset
  };
}

// Hook for managing multiple operation loading states
export function useOperationLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((operation: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [operation]: isLoading
    }));
  }, []);

  const isLoading = useCallback((operation: string) => {
    return loadingStates[operation] || false;
  }, [loadingStates]);

  const withOperationLoading = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(operation, true);
    
    try {
      const result = await asyncFn();
      return result;
    } catch (error) {
      console.error(`Operation ${operation} failed:`, error);
      return null;
    } finally {
      setLoading(operation, false);
    }
  }, [setLoading]);

  return {
    isLoading,
    setLoading,
    withOperationLoading,
    hasAnyLoading: Object.values(loadingStates).some(Boolean)
  };
}