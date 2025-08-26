import type { IDatabaseAdapter, IRepositorySet } from './interfaces';
import { PrismaAdapter } from './prisma/PrismaAdapter';

/**
 * Database Adapter - PostgreSQL via Prisma
 * Manages database connections and repository access
 */
export class DatabaseAdapter {
  private static instance: DatabaseAdapter | null = null;
  private adapter: IDatabaseAdapter;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    console.log(`🔧 Using PostgreSQL database via Prisma`);
    this.adapter = new PrismaAdapter();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  /**
   * Get the underlying adapter
   */
  public getAdapter(): IDatabaseAdapter {
    return this.adapter;
  }

  /**
   * Get transcript repository
   */
  public getTranscriptRepository() {
    return this.adapter.getTranscriptRepository();
  }

  /**
   * Get insight repository
   */
  public getInsightRepository() {
    return this.adapter.getInsightRepository();
  }

  /**
   * Get post repository
   */
  public getPostRepository() {
    return this.adapter.getPostRepository();
  }

  /**
   * Get scheduled post repository
   */
  public getScheduledPostRepository() {
    return this.adapter.getScheduledPostRepository();
  }

  /**
   * Get processing job repository
   */
  public getProcessingJobRepository() {
    return this.adapter.getProcessingJobRepository();
  }

  /**
   * Get settings repository
   */
  public getSettingsRepository() {
    return this.adapter.getSettingsRepository();
  }

  /**
   * Get analytics repository
   */
  public getAnalyticsRepository() {
    return this.adapter.getAnalyticsRepository();
  }

  /**
   * Get all repositories
   */
  public getRepositories(): IRepositorySet {
    return this.adapter.getRepositories();
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    await this.adapter.close();
  }

  /**
   * Reset singleton instance (mainly for testing)
   */
  public static reset(): void {
    DatabaseAdapter.instance = null;
  }
}

/**
 * Export convenience function to get adapter instance
 */
export function getDatabaseAdapter(): DatabaseAdapter {
  return DatabaseAdapter.getInstance();
}