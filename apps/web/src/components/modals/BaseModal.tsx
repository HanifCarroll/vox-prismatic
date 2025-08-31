/**
 * Base Modal Interface
 * 
 * All modals in the application MUST follow this interface.
 * This ensures consistency and enables centralized modal management.
 */

import { ReactNode } from 'react';

/**
 * ★ Insight ─────────────────────────────────────
 * Standardized modal interface ensures:
 * - Consistent prop handling
 * - Easy modal store integration
 * - No prop drilling
 * - Type safety across all modals
 * ─────────────────────────────────────────────────
 */

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: any; // Modal-specific data passed from the store
}

/**
 * Extended modal props for modals that need additional callbacks
 */
export interface ExtendedModalProps extends BaseModalProps {
  onSuccess?: (result?: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Helper to ensure modal data has required fields
 */
export function ensureModalData<T>(data: any, defaults: Partial<T>): T {
  return {
    ...defaults,
    ...data,
  } as T;
}