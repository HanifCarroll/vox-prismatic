import { useState, useEffect, useCallback } from 'react';
import type { RecentItem } from '@/types/recently-viewed';

const STORAGE_KEY = 'recently-viewed';
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentItems(parsed.slice(0, MAX_ITEMS)); // Ensure we don't exceed max
      }
    } catch (error) {
      console.error('Failed to load recently viewed items:', error);
    }
  }, []);

  // Save to localStorage whenever items change
  const saveToStorage = useCallback((items: RecentItem[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save recently viewed items:', error);
    }
  }, []);

  // Add or update an item in recently viewed
  const addRecentItem = useCallback((item: Omit<RecentItem, 'viewedAt'>) => {
    setRecentItems(current => {
      // Remove existing item with same id and type if present
      const filtered = current.filter(existing => 
        !(existing.id === item.id && existing.type === item.type)
      );
      
      // Add new item at the beginning
      const newItem: RecentItem = {
        ...item,
        viewedAt: new Date().toISOString()
      };
      
      // Keep only the most recent MAX_ITEMS
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Clear all recent items
  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Remove a specific item
  const removeRecentItem = useCallback((id: string, type: RecentItem['type']) => {
    setRecentItems(current => {
      const updated = current.filter(item => 
        !(item.id === id && item.type === type)
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Get recent items by type
  const getRecentItemsByType = useCallback((type: RecentItem['type']) => {
    return recentItems.filter(item => item.type === type);
  }, [recentItems]);

  return {
    recentItems,
    addRecentItem,
    clearRecentItems,
    removeRecentItem,
    getRecentItemsByType
  };
}