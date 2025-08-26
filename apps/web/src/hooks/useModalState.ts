import { useState, useCallback } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/lib/toast';

export interface ModalState<T> {
  isOpen: boolean;
  selectedItem: T | null;
  isLoading: boolean;
}

export interface ModalActions<T> {
  open: (item?: T) => void;
  close: () => void;
  setSelectedItem: (item: T | null) => void;
}

export interface UseModalOptions<T> {
  onSuccess?: (item: T, data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorContext?: string;
}

/**
 * Generic modal state management hook
 * Handles modal open/close state, selected item, and form submissions
 */
export function useModalState<T extends { id: string }>(
  updateMutation?: UseMutationResult<any, Error, any>,
  options: UseModalOptions<T> = {}
) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const toast = useToast();

  // Open modal with optional item selection
  const open = useCallback((item?: T) => {
    setSelectedItem(item || null);
    setIsOpen(true);
  }, []);

  // Close modal and clear selection
  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedItem(null);
  }, []);

  // Update selected item
  const updateSelectedItem = useCallback((item: T | null) => {
    setSelectedItem(item);
  }, []);

  // Handle form submission with mutation
  const handleSubmit = useCallback(async (formData: Partial<T>) => {
    if (!selectedItem || !updateMutation) return;

    const mutationData = {
      id: selectedItem.id,
      ...formData,
    };

    updateMutation.mutate(mutationData, {
      onSuccess: (data) => {
        close();
        
        // Show success message
        const message = options.successMessage || `Successfully updated ${selectedItem.id}`;
        toast.success('Changes saved', {
          description: message
        });

        // Call custom success handler
        options.onSuccess?.(selectedItem, data);
      },
      onError: (error) => {
        console.error('Modal form submission failed:', error);
        
        // Show error message
        const context = options.errorContext || 'save changes';
        toast.apiError(context, error.message);

        // Call custom error handler
        options.onError?.(error);
      }
    });
  }, [selectedItem, updateMutation, close, toast, options]);

  // Create new item (for creation modals)
  const handleCreate = useCallback(async (formData: Omit<T, 'id'>) => {
    if (!updateMutation) return;

    updateMutation.mutate(formData, {
      onSuccess: (data) => {
        close();
        
        // Show success message
        const message = options.successMessage || 'Successfully created item';
        toast.success('Item created', {
          description: message
        });

        // Call custom success handler
        options.onSuccess?.(data, data);
      },
      onError: (error) => {
        console.error('Modal form creation failed:', error);
        
        // Show error message
        const context = options.errorContext || 'create item';
        toast.apiError(context, error.message);

        // Call custom error handler
        options.onError?.(error);
      }
    });
  }, [updateMutation, close, toast, options]);

  // State object
  const state: ModalState<T> = {
    isOpen,
    selectedItem,
    isLoading: updateMutation?.isPending || false,
  };

  // Actions object
  const actions: ModalActions<T> & {
    handleSubmit: (formData: Partial<T>) => Promise<void>;
    handleCreate: (formData: Omit<T, 'id'>) => Promise<void>;
  } = {
    open,
    close,
    setSelectedItem: updateSelectedItem,
    handleSubmit,
    handleCreate,
  };

  return { state, actions };
}

/**
 * Specialized hook for edit modals
 */
export function useEditModal<T extends { id: string }>(
  updateMutation: UseMutationResult<T, Error, { id: string } & Partial<T>>,
  options: UseModalOptions<T> = {}
) {
  return useModalState(updateMutation, {
    successMessage: 'Item updated successfully',
    errorContext: 'update item',
    ...options,
  });
}

/**
 * Specialized hook for creation modals
 */
export function useCreateModal<T extends { id: string }>(
  createMutation: UseMutationResult<T, Error, Omit<T, 'id'>>,
  options: UseModalOptions<T> = {}
) {
  return useModalState(createMutation, {
    successMessage: 'Item created successfully',
    errorContext: 'create item',
    ...options,
  });
}

/**
 * Hook for confirmation dialogs
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const confirm = useCallback((
    confirmTitle: string,
    confirmMessage: string,
    confirmAction: () => void
  ) => {
    setTitle(confirmTitle);
    setMessage(confirmMessage);
    setOnConfirm(() => confirmAction);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTitle('');
    setMessage('');
    setOnConfirm(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    close();
  }, [onConfirm, close]);

  return {
    state: { isOpen, title, message },
    actions: { confirm, close, handleConfirm },
  };
}