import { Injectable, signal, computed } from '@angular/core';

/**
 * Optimistic Update Service
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

export enum EntityType {
  TRANSCRIPT = 'transcript',
  INSIGHT = 'insight',
  POST = 'post',
  SCHEDULED_POST = 'scheduledPost',
  PROMPT = 'prompt',
  PROJECT = 'project'
}

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

@Injectable({
  providedIn: 'root'
})
export class OptimisticUpdateService {
  // State using Angular signals
  private updates = signal<Map<string, OptimisticUpdate<unknown, unknown>>>(new Map());
  
  // Computed values
  pendingUpdates = computed(() => {
    const allUpdates = Array.from(this.updates().values());
    return allUpdates.filter(u => u.status === UpdateStatus.PENDING);
  });
  
  hasPendingUpdates = computed(() => this.pendingUpdates().length > 0);
  
  /**
   * Add a new optimistic update
   */
  addOptimisticUpdate<T, O = T>(
    update: Omit<OptimisticUpdate<T, O>, 'id' | 'timestamp' | 'status'>
  ): string {
    const id = `${update.entityType}-${update.entityId}-${Date.now()}`;
    const newUpdate: OptimisticUpdate<T, O> = {
      ...update,
      id,
      timestamp: Date.now(),
      status: UpdateStatus.PENDING,
    };
    
    const newUpdates = new Map(this.updates());
    newUpdates.set(id, newUpdate);
    this.updates.set(newUpdates);
    
    return id;
  }
  
  /**
   * Resolve an update (success or failure)
   */
  resolveUpdate(updateId: string, success: boolean, error?: string): void {
    const update = this.updates().get(updateId);
    if (!update) return;
    
    const newUpdates = new Map(this.updates());
    newUpdates.set(updateId, {
      ...update,
      status: success ? UpdateStatus.SUCCESS : UpdateStatus.ERROR,
      error: error,
    });
    this.updates.set(newUpdates);
    
    // Auto-clear successful updates after a delay
    if (success) {
      setTimeout(() => {
        this.clearUpdate(updateId);
      }, 1000);
    }
  }
  
  /**
   * Rollback an update to original state
   */
  rollbackUpdate(updateId: string): void {
    const update = this.updates().get(updateId);
    if (!update) return;
    
    const newUpdates = new Map(this.updates());
    newUpdates.set(updateId, {
      ...update,
      status: UpdateStatus.ERROR,
      optimisticData: update.originalData, // Restore original
    });
    this.updates.set(newUpdates);
    
    // Auto-clear after showing rollback
    setTimeout(() => {
      this.clearUpdate(updateId);
    }, 2000);
  }
  
  /**
   * Clear a specific update
   */
  clearUpdate(updateId: string): void {
    const newUpdates = new Map(this.updates());
    newUpdates.delete(updateId);
    this.updates.set(newUpdates);
  }
  
  /**
   * Clear all updates
   */
  clearAllUpdates(): void {
    this.updates.set(new Map());
  }
  
  /**
   * Get updates for a specific entity
   */
  getUpdatesByEntity(entityType: EntityType, entityId: string): OptimisticUpdate<unknown, unknown>[] {
    const allUpdates = Array.from(this.updates().values());
    return allUpdates.filter(
      u => u.entityType === entityType && u.entityId === entityId
    );
  }
  
  /**
   * Check if entity has optimistic updates
   */
  hasOptimisticUpdate(entityType: EntityType, entityId: string): boolean {
    const updates = this.getUpdatesByEntity(entityType, entityId);
    return updates.some(u => u.status === UpdateStatus.PENDING);
  }
  
  /**
   * Get the latest optimistic data for an entity
   */
  getOptimisticData<O>(entityType: EntityType, entityId: string): O | null {
    const updates = this.getUpdatesByEntity(entityType, entityId);
    const latestPending = updates
      .filter(u => u.status === UpdateStatus.PENDING)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return latestPending ? latestPending.optimisticData as O : null;
  }
  
  /**
   * Get entity optimistic state (reactive)
   */
  getEntityOptimisticState(entityType: EntityType, entityId: string) {
    return computed(() => ({
      hasUpdate: this.hasOptimisticUpdate(entityType, entityId),
      optimisticData: this.getOptimisticData(entityType, entityId),
      updates: this.getUpdatesByEntity(entityType, entityId),
    }));
  }
  
  /**
   * Merge server data with optimistic updates
   */
  mergeOptimisticData<T extends { id: string }>(
    serverData: T[],
    entityType: EntityType
  ): T[] {
    return serverData.map(item => {
      const optimisticData = this.getOptimisticData<T>(entityType, item.id);
      
      if (optimisticData) {
        // Merge optimistic data with server data
        // Optimistic data takes precedence for pending updates
        return { ...item, ...optimisticData };
      }
      
      return item;
    });
  }
  
  /**
   * Check if an entity is pending
   */
  isEntityPending(entityType: EntityType, entityId: string): boolean {
    return this.hasOptimisticUpdate(entityType, entityId);
  }
  
  /**
   * Helper method to apply optimistic update and handle server response
   */
  async applyOptimisticUpdate<T, O = T>(
    entityType: EntityType,
    entityId: string,
    action: string,
    originalData: T,
    optimisticData: O,
    serverOperation: () => Promise<void>
  ): Promise<void> {
    // Add optimistic update
    const updateId = this.addOptimisticUpdate({
      entityType,
      entityId,
      action,
      originalData,
      optimisticData,
    });
    
    try {
      // Execute server operation
      await serverOperation();
      
      // Mark as successful
      this.resolveUpdate(updateId, true);
    } catch (error) {
      // Rollback on error
      this.rollbackUpdate(updateId);
      throw error;
    }
  }
}