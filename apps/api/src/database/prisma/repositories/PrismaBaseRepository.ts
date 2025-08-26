import type { PrismaClient } from '../generated';
import type { IRepository } from '../../interfaces';
import type { Result } from '@content-creation/types';
import { getPrismaClient } from '../client';
import { generateId } from '../../../lib/id-generator';

/**
 * Base Prisma Repository
 * Provides common functionality for all Prisma repository implementations
 */
export abstract class PrismaBaseRepository implements IRepository {
  protected prisma: PrismaClient | null = null;

  /**
   * Get Prisma client instance
   */
  protected async getClient(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = await getPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Execute a database operation with error handling
   */
  async execute<T>(
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
   * Execute a synchronous database operation with error handling
   */
  executeSync<T>(
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
   * Generate unique ID with prefix
   */
  generateId(prefix: string): string {
    return generateId(prefix);
  }

  /**
   * Get current ISO timestamp
   */
  now(): string {
    return new Date().toISOString();
  }

  /**
   * Build search condition for Prisma
   */
  protected buildSearchCondition(field: string, searchQuery: string | undefined) {
    if (!searchQuery) return undefined;
    return {
      [field]: {
        contains: searchQuery,
        mode: 'insensitive' as const
      }
    };
  }

  /**
   * Build order by clause for Prisma
   */
  protected buildOrderBy(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    // Handle nested properties like 'scores.total'
    const keys = sortBy.split('.');
    if (keys.length > 1) {
      // For nested properties, we need to build a nested object
      let orderBy: any = {};
      let current = orderBy;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = sortOrder;
      
      return orderBy;
    }
    
    return { [sortBy]: sortOrder };
  }

  /**
   * Build pagination options for Prisma
   */
  protected buildPagination(limit?: number, offset?: number) {
    const options: { take?: number; skip?: number } = {};
    
    if (limit !== undefined) {
      options.take = limit;
    }
    
    if (offset !== undefined) {
      options.skip = offset;
    }
    
    return options;
  }

  /**
   * Convert Prisma date strings to Date objects
   */
  protected parseDate(dateString: string | Date | null | undefined): Date | undefined {
    if (!dateString) return undefined;
    if (dateString instanceof Date) return dateString;
    return new Date(dateString);
  }

  /**
   * Format date to ISO string
   */
  protected formatDate(date: Date | string | null | undefined): string | undefined {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }
}