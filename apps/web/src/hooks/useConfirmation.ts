import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  onConfirm?: () => void;
}

export function useConfirmation() {
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default'
  });

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({
        ...options,
        isOpen: true,
        onConfirm: () => {
          resolve(true);
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        }
      });

      // Handle cancellation by closing the dialog
      const closeHandler = () => {
        resolve(false);
        setConfirmationState(prev => ({ ...prev, isOpen: false }));
      };

      // Store close handler for dialog cancellation
      setConfirmationState(prev => ({ 
        ...prev, 
        onCancel: closeHandler 
      } as any));
    });
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmationState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirm,
    confirmationProps: {
      isOpen: confirmationState.isOpen,
      onClose: closeConfirmation,
      onConfirm: confirmationState.onConfirm || (() => {}),
      title: confirmationState.title,
      description: confirmationState.description,
      confirmText: confirmationState.confirmText,
      cancelText: confirmationState.cancelText,
      variant: confirmationState.variant
    }
  };
}