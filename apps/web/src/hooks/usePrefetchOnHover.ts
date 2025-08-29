import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'react-use';
import { safePrefetch, debounce } from '@/lib/prefetch-utils';

interface UsePrefetchOnHoverOptions {
  delay?: number;
  respectConnection?: boolean;
  disabled?: boolean;
}

interface UsePrefetchOnHoverReturn {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
}

export function usePrefetchOnHover(
  href: string,
  options: UsePrefetchOnHoverOptions = {}
): UsePrefetchOnHoverReturn {
  const { delay = 300, respectConnection = true, disabled = false } = options;
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const prefetchedRef = useRef<boolean>(false);

  // Debounced prefetch function
  const debouncedPrefetch = useCallback(
    debounce(async () => {
      if (disabled || prefetchedRef.current) return;
      
      const success = await safePrefetch(
        (url) => router.prefetch(url),
        href,
        { respectConnection }
      );
      
      if (success) {
        prefetchedRef.current = true;
      }
    }, delay),
    [href, disabled, respectConnection, delay, router]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      debouncedPrefetch();
    }, delay);
  }, [debouncedPrefetch, delay, disabled]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const handleFocus = useCallback(() => {
    if (disabled) return;
    // Immediate prefetch on focus for accessibility
    debouncedPrefetch();
  }, [debouncedPrefetch, disabled]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
  };
}