import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Optimistic Update Store
 * 
 * Manages optimistic updates across the application to provide instant UI feedback
 * while server operations complete in the background.
 * 
 * Key concepts:
 * - Optimistic updates are applied immediately to the UI
 * - Original data is preserved for rollback on error
 * - Updates are reconciled when server responds
 * - Visual indicators show pending states
 */

import { EntityType, QueueJobStatus } from '@content-creation/types';

export enum UpdateStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface OptimisticUpdate<T = any, O = T> {
  id: string; // Unique ID for this update
  entityType: EntityType;
  entityId: string;
  action: string; // e.g., 'approve', 'delete', 'move'
  optimisticData: O; // The optimistic state (can be extended type)
  originalData: T; // Original state for rollback
  timestamp: number;
  status: UpdateStatus;
  error?: string;
}

interface OptimisticStore {
  // State
  updates: Map<string, OptimisticUpdate<unknown, unknown>>;
  
  // Actions
  addOptimisticUpdate: <T, O = T>(update: Omit<OptimisticUpdate<T, O>, 'id' | 'timestamp' | 'status'>) => string;
  resolveUpdate: (updateId: string, success: boolean, error?: string) => void;
  rollbackUpdate: (updateId: string) => void;
  clearUpdate: (updateId: string) => void;
  clearAllUpdates: () => void;
  
  // Queries
  getUpdatesByEntity: (entityType: EntityType, entityId: string) => OptimisticUpdate<unknown, unknown>[];
  getPendingUpdates: () => OptimisticUpdate<unknown, unknown>[];
  hasOptimisticUpdate: (entityType: EntityType, entityId: string) => boolean;
  getOptimisticData: <O>(entityType: EntityType, entityId: string) => O | null;
}

export const useOptimisticStore = create<OptimisticStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      updates: new Map(),
      
      // Add a new optimistic update
      addOptimisticUpdate: <T, O = T>(update: Omit<OptimisticUpdate<T, O>, 'id' | 'timestamp' | 'status'>) => {
        const id = `${update.entityType}-${update.entityId}-${Date.now()}`;
        const newUpdate: OptimisticUpdate<T, O> = {
          ...update,
          id,
          timestamp: Date.now(),
          status: UpdateStatus.PENDING,
        };
        
        set((state) => {
          const updates = new Map(state.updates);
          updates.set(id, newUpdate);
          return { updates };
        });
        
        return id;
      },
      
      // Resolve an update (success or failure)
      resolveUpdate: (updateId, success, error) => {
        set((state) => {
          const updates = new Map(state.updates);
          const update = updates.get(updateId);
          
          if (update) {
            updates.set(updateId, {
              ...update,
              status: success ? UpdateStatus.SUCCESS : UpdateStatus.ERROR,
              error: error,
            });
            
            // Auto-clear successful updates after a delay
            if (success) {
              setTimeout(() => {
                get().clearUpdate(updateId);
              }, 1000);
            }
          }
          
          return { updates };
        });
      },
      
      // Rollback an update to original state
      rollbackUpdate: (updateId) => {
        const update = get().updates.get(updateId);
        if (!update) return;
        
        set((state) => {
          const updates = new Map(state.updates);
          updates.set(updateId, {
            ...update,
            status: UpdateStatus.ERROR,
            optimisticData: update.originalData, // Restore original
          });
          
          // Auto-clear after showing rollback
          setTimeout(() => {
            get().clearUpdate(updateId);
          }, 2000);
          
          return { updates };
        });
      },
      
      // Clear a specific update
      clearUpdate: (updateId) => {
        set((state) => {
          const updates = new Map(state.updates);
          updates.delete(updateId);
          return { updates };
        });
      },
      
      // Clear all updates
      clearAllUpdates: () => {
        set({ updates: new Map() });
      },
      
      // Get updates for a specific entity
      getUpdatesByEntity: (entityType, entityId) => {
        const updates = Array.from(get().updates.values());
        return updates.filter(
          (u) => u.entityType === entityType && u.entityId === entityId
        );
      },
      
      // Get all pending updates
      getPendingUpdates: () => {
        const updates = Array.from(get().updates.values());
        return updates.filter((u) => u.status === UpdateStatus.PENDING);
      },
      
      // Check if entity has optimistic updates
      hasOptimisticUpdate: (entityType, entityId) => {
        const updates = get().getUpdatesByEntity(entityType, entityId);
        return updates.some((u) => u.status === UpdateStatus.PENDING);
      },
      
      // Get the latest optimistic data for an entity
      getOptimisticData: (entityType, entityId) => {
        const updates = get().getUpdatesByEntity(entityType, entityId);
        const latestPending = updates
          .filter((u) => u.status === UpdateStatus.PENDING)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        return latestPending ? latestPending.optimisticData : null;
      },
    }),
    {
      name: 'optimistic-store',
    }
  )
);

// Selector hooks for granular subscriptions
export const useOptimisticUpdates = () => 
  useOptimisticStore((state) => state.updates);

export const usePendingUpdates = () =>
  useOptimisticStore((state) => state.getPendingUpdates());

export const useEntityOptimisticState = (entityType: EntityType, entityId: string) =>
  useOptimisticStore((state) => ({
    hasUpdate: state.hasOptimisticUpdate(entityType, entityId),
    optimisticData: state.getOptimisticData(entityType, entityId),
    updates: state.getUpdatesByEntity(entityType, entityId),
  }));

// Helper to merge server data with optimistic updates
export function mergeOptimisticData<T extends { id: string }>(
  serverData: T[],
  entityType: EntityType
): T[] {
  const store = useOptimisticStore.getState();
  
  return serverData.map((item) => {
    const optimisticData = store.getOptimisticData<T>(entityType, item.id);
    
    if (optimisticData) {
      // Merge optimistic data with server data
      // Optimistic data takes precedence for pending updates
      return { ...item, ...optimisticData };
    }
    
    return item;
  });
}

// Helper to check if an entity is pending
export function isEntityPending(entityType: EntityType, entityId: string): boolean {
  return useOptimisticStore.getState().hasOptimisticUpdate(entityType, entityId);
}