/**
 * Repository interface extensions for typed Prisma access
 * Provides type-safe access to underlying Prisma client and mapping functions
 */

import { PrismaService } from '../../database/prisma.service';

/**
 * Base repository interface with typed Prisma access
 * All repositories should extend this for consistent type safety
 */
export interface TypedRepository<TEntity, TPrismaModel> {
  /**
   * Access to the underlying Prisma service
   */
  readonly prisma: PrismaService;

  /**
   * Map Prisma model to domain entity
   */
  mapToEntity(model: TPrismaModel): TEntity;

  /**
   * Update entity status directly via Prisma
   * Bypasses DTO validation for state machine controlled updates
   */
  updateStatus(id: string, status: string): Promise<TPrismaModel>;
}

/**
 * Extended repository interface for scheduled posts
 * Provides typed access to Prisma operations
 */
export interface ScheduledPostRepositoryExtension extends TypedRepository<any, any> {
  updateStatus(id: string, status: string): Promise<any>;
}

/**
 * Extended repository interface for processing jobs
 * Provides typed access to Prisma operations
 */
export interface ProcessingJobRepositoryExtension extends TypedRepository<any, any> {
  updateStatus(id: string, status: string): Promise<any>;
}