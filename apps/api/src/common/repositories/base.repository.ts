/**
 * Base repository interface that all repositories should extend
 * Provides common repository patterns and functionality
 */
export abstract class BaseRepository<T> {
  abstract create(data: any): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filters?: any): Promise<T[]>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
  
  /**
   * Count entities matching the given filters
   * Used for proper pagination metadata
   */
  abstract count?(filters?: any): Promise<number>;
}