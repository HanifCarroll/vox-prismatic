import type { Result } from '@content-creation/types';

/**
 * Base Repository Interface
 * Defines common functionality for all repository implementations
 */
export interface IRepository {
  /**
   * Execute a database operation with error handling
   */
  execute<T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<Result<T>>;

  /**
   * Execute a synchronous database operation with error handling
   */
  executeSync<T>(
    operation: () => T,
    errorMessage?: string
  ): Result<T>;

  /**
   * Generate unique ID with prefix
   */
  generateId(prefix: string): string;

  /**
   * Get current ISO timestamp
   */
  now(): string;
}

/**
 * Common filter interface for all repositories
 */
export interface BaseFilter {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}