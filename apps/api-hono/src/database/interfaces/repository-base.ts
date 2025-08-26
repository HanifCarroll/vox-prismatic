/**
 * Standardized Repository Interfaces
 * Provides consistent patterns across all repositories
 */

import type { Result } from '@content-creation/types';

/**
 * Base repository interface with common CRUD operations
 * All repositories should implement this interface
 */
export interface IBaseRepository<TEntity, TFilter, TCreate, TUpdate> {
  /**
   * Find single entity by ID
   */
  findById(id: string): Promise<Result<TEntity | null>>;

  /**
   * Find multiple entities with optional filtering
   */
  findMany(filter?: TFilter): Promise<Result<TEntity[]>>;

  /**
   * Create single entity
   */
  create(data: TCreate): Promise<Result<TEntity>>;

  /**
   * Create multiple entities (batch operation)
   */
  createMany(data: TCreate[]): Promise<Result<TEntity[]>>;

  /**
   * Update single entity
   */
  update(id: string, data: TUpdate): Promise<Result<TEntity>>;

  /**
   * Delete single entity
   */
  delete(id: string): Promise<Result<void>>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<Result<boolean>>;
}

/**
 * Extended repository interface with additional query methods
 */
export interface IQueryableRepository<TEntity, TFilter, TCreate, TUpdate> 
  extends IBaseRepository<TEntity, TFilter, TCreate, TUpdate> {
  
  /**
   * Count entities matching filter
   */
  count(filter?: TFilter): Promise<Result<number>>;

  /**
   * Find first entity matching filter
   */
  findFirst(filter?: TFilter): Promise<Result<TEntity | null>>;

  /**
   * Delete entities matching filter
   */
  deleteMany(filter: TFilter): Promise<Result<number>>;

  /**
   * Update entities matching filter
   */
  updateMany(filter: TFilter, data: TUpdate): Promise<Result<number>>;
}

/**
 * Repository interface with relationship loading
 */
export interface IRelationalRepository<TEntity, TEntityWithRelations, TFilter, TCreate, TUpdate> 
  extends IBaseRepository<TEntity, TFilter, TCreate, TUpdate> {
  
  /**
   * Find entity with related data
   */
  findByIdWithRelations(id: string): Promise<Result<TEntityWithRelations | null>>;

  /**
   * Find entities with related data
   */
  findManyWithRelations(filter?: TFilter): Promise<Result<TEntityWithRelations[]>>;
}

/**
 * Common pagination parameters
 */
export interface IPagination {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Common sorting parameters
 */
export interface ISorting<TFields = string> {
  sortBy?: TFields;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result response
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}