import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { getDatabase, getSQLiteConnection } from '../connection';
import type { Result } from '../index';
import * as schema from '../schema';

/**
 * Base Repository Class
 * Provides common functionality for all domain repositories
 */
export abstract class BaseRepository {
  protected db: BunSQLiteDatabase<typeof schema>;
  protected sqlite: ReturnType<typeof getSQLiteConnection>;

  constructor() {
    this.db = getDatabase();
    this.sqlite = getSQLiteConnection();
  }


  /**
   * Execute a database query with error handling
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    errorMessage = 'Database operation failed'
  ): Promise<Result<T>> {
    try {
      const data = await operation();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Execute a synchronous database query with error handling
   */
  protected executeSync<T>(
    operation: () => T,
    errorMessage = 'Database operation failed'
  ): Result<T> {
    try {
      const data = operation();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Generate a unique ID for new records
   */
  protected generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current ISO timestamp
   */
  protected now(): string {
    return new Date().toISOString();
  }

  /**
   * Build search condition for text fields
   */
  protected buildSearchCondition(searchQuery: string | undefined): string | undefined {
    if (!searchQuery) return undefined;
    return `%${searchQuery.toLowerCase()}%`;
  }

  /**
   * Apply sorting to query based on sortBy and sortOrder
   */
  protected applySorting<T extends Record<string, any>>(
    items: T[], 
    sortBy: string = 'createdAt', 
    sortOrder: 'asc' | 'desc' = 'desc'
  ): T[] {
    return items.sort((a, b) => {
      let aVal: any, bVal: any;
      
      // Handle nested properties like 'scores.total'
      const keys = sortBy.split('.');
      aVal = keys.reduce((obj, key) => obj?.[key], a);
      bVal = keys.reduce((obj, key) => obj?.[key], b);

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else if (aVal instanceof Date && bVal instanceof Date) {
        aVal = aVal.getTime();
        bVal = bVal.getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  /**
   * Apply pagination to results
   */
  protected applyPagination<T>(
    items: T[], 
    limit?: number, 
    offset?: number
  ): T[] {
    if (!limit) return items;
    
    const startIndex = offset || 0;
    const endIndex = startIndex + limit;
    
    return items.slice(startIndex, endIndex);
  }
}