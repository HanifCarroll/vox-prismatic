import type { IDatabaseAdapter, IRepositorySet } from './interfaces';
import { PrismaAdapter } from './prisma/PrismaAdapter';
import { DrizzleAdapter } from './drizzle/DrizzleAdapter';

/**
 * Database Adapter Factory
 * Creates and manages the appropriate database adapter based on configuration
 */
export class DatabaseAdapter {
  private static instance: DatabaseAdapter | null = null;
  private adapter: IDatabaseAdapter;
  private adapterType: 'prisma' | 'drizzle';

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Determine which adapter to use from environment variable
    // Default to 'prisma' since Drizzle migrations have been removed
    this.adapterType = (process.env.DATABASE_ADAPTER as 'prisma' | 'drizzle') || 'prisma';
    
    console.log(`🔧 Using database adapter: ${this.adapterType}`);
    
    // Create the appropriate adapter
    if (this.adapterType === 'prisma') {
      this.adapter = new PrismaAdapter();
    } else {
      this.adapter = new DrizzleAdapter();
    }
  }

  /**
   * Get singleton instance of DatabaseAdapter
   */
  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  /**
   * Initialize the database adapter
   */
  public async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Get all repositories from the adapter
   */
  public getRepositories(): IRepositorySet {
    return this.adapter.getRepositories();
  }

  /**
   * Get specific repository
   */
  public getTranscriptRepository() {
    return this.getRepositories().transcripts;
  }

  public getInsightRepository() {
    return this.getRepositories().insights;
  }

  public getPostRepository() {
    return this.getRepositories().posts;
  }

  public getScheduledPostRepository() {
    return this.getRepositories().scheduledPosts;
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    await this.adapter.close();
  }

  /**
   * Run database migrations
   */
  public async migrate(): Promise<void> {
    await this.adapter.migrate();
  }

  /**
   * Reset database (for testing)
   */
  public async reset(): Promise<void> {
    if (this.adapter.reset) {
      await this.adapter.reset();
    } else {
      console.warn(`Reset not implemented for ${this.adapter.getName()} adapter`);
    }
  }

  /**
   * Get the name of the current adapter
   */
  public getAdapterName(): string {
    return this.adapter.getName();
  }

  /**
   * Switch to a different adapter (requires reinitialization)
   */
  public async switchAdapter(type: 'prisma' | 'drizzle'): Promise<void> {
    if (type === this.adapterType) {
      console.log(`Already using ${type} adapter`);
      return;
    }

    // Close current adapter
    await this.adapter.close();

    // Switch to new adapter
    this.adapterType = type;
    if (type === 'prisma') {
      this.adapter = new PrismaAdapter();
    } else {
      this.adapter = new DrizzleAdapter();
    }

    // Initialize new adapter
    await this.adapter.initialize();
    
    console.log(`✅ Switched to ${type} adapter`);
  }

  /**
   * Reset singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    if (DatabaseAdapter.instance) {
      DatabaseAdapter.instance.adapter.close();
      DatabaseAdapter.instance = null;
    }
  }
}

/**
 * Export convenience function to get database adapter
 */
export const getDatabaseAdapter = (): DatabaseAdapter => {
  return DatabaseAdapter.getInstance();
};

/**
 * Export convenience function to get repositories
 */
export const getRepositories = (): IRepositorySet => {
  return getDatabaseAdapter().getRepositories();
};