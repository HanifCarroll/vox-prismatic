'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

/**
 * Hook for managing keyboard shortcuts in the application
 * Supports modifiers and prevents default browser behaviors
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      // Check if the key matches
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
        continue;
      }
      
      // Check modifiers
      const ctrlPressed = event.ctrlKey || event.metaKey;
      const shiftPressed = event.shiftKey;
      const altPressed = event.altKey;
      
      // Match based on specified modifiers
      const ctrlMatch = shortcut.ctrl || shortcut.meta ? ctrlPressed : !ctrlPressed;
      const shiftMatch = shortcut.shift ? shiftPressed : !shiftPressed;
      const altMatch = shortcut.alt ? altPressed : !altPressed;
      
      if (ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    }
  }, [shortcuts]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts used throughout the app
 */
export const commonShortcuts = {
  search: { key: 'k', meta: true, description: 'Focus search' },
  newItem: { key: 'n', meta: true, description: 'Create new item' },
  selectAll: { key: 'a', meta: true, description: 'Select all items' },
  clearSelection: { key: 'Escape', description: 'Clear selection' },
  deleteSelected: { key: 'Delete', description: 'Delete selected items' },
  approve: { key: 'a', meta: true, shift: true, description: 'Approve selected' },
  reject: { key: 'r', meta: true, shift: true, description: 'Reject selected' },
  toggleFilter: { key: 'f', meta: true, description: 'Toggle filters' },
  previousTab: { key: '[', meta: true, description: 'Previous tab' },
  nextTab: { key: ']', meta: true, description: 'Next tab' },
};