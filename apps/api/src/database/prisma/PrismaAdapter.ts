import type { IDatabaseAdapter, IRepositorySet } from '../interfaces';
import { 
  initPrismaClient, 
  closePrismaClient, 
  runPrismaMigrations,
  resetPrismaDatabase
} from './client';
import {
  PrismaTranscriptRepository,
  PrismaInsightRepository,
  PrismaPostRepository,
  PrismaScheduledPostRepository
} from './repositories';

/**
 * Prisma Database Adapter
 * Provides Prisma implementation of the database interface
 */
export class PrismaAdapter implements IDatabaseAdapter {
  private repositories: IRepositorySet | null = null;
  private initialized = false;

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Prisma client
      await initPrismaClient();
      
      // Run migrations (only in development)
      if (process.env.NODE_ENV === 'development') {
        const migrationResult = await runPrismaMigrations();
        if (!migrationResult.success) {
          console.warn('⚠️ Prisma migrations could not be applied automatically');
        }
      }
      
      // Create repository instances
      this.repositories = {
        transcripts: new PrismaTranscriptRepository(),
        insights: new PrismaInsightRepository(),
        posts: new PrismaPostRepository(),
        scheduledPosts: new PrismaScheduledPostRepository()
      };
      
      this.initialized = true;
      console.log('✅ Prisma adapter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Prisma adapter:', error);
      throw error;
    }
  }

  /**
   * Get all repositories
   */
  getRepositories(): IRepositorySet {
    if (!this.repositories) {
      throw new Error('Prisma adapter not initialized. Call initialize() first.');
    }
    return this.repositories;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await closePrismaClient();
    this.repositories = null;
    this.initialized = false;
  }

  /**
   * Run migrations
   */
  async migrate(): Promise<void> {
    const result = await runPrismaMigrations();
    if (!result.success) {
      throw result.error;
    }
  }

  /**
   * Reset database (for testing)
   */
  async reset(): Promise<void> {
    const result = await resetPrismaDatabase();
    if (!result.success) {
      throw result.error;
    }
  }

  /**
   * Get adapter name
   */
  getName(): string {
    return 'prisma';
  }
}