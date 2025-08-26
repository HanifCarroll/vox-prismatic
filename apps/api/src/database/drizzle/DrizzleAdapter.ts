import type { IDatabaseAdapter, IRepositorySet } from '../interfaces';
import { initDatabase, runMigrations, closeDatabase, resetDatabase } from '../../lib/db-connection';
import { 
  TranscriptRepository,
  InsightRepository,
  PostRepository,
  ScheduledPostRepository
} from '../../repositories';

/**
 * Drizzle Database Adapter
 * Provides Drizzle implementation of the database interface
 * Wraps existing Drizzle repositories to match the interface
 */
export class DrizzleAdapter implements IDatabaseAdapter {
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
      // Initialize Drizzle database
      initDatabase();
      
      // Try to run migrations, but don't fail if they don't exist
      try {
        runMigrations();
      } catch (migrationError) {
        console.warn('⚠️ Drizzle migrations not found or failed. This is expected if transitioning to Prisma.');
        console.warn('   If you need Drizzle, regenerate migrations or switch to Prisma adapter.');
      }
      
      // Create repository instances (using existing ones)
      this.repositories = {
        transcripts: new TranscriptRepository() as any, // Type casting for now
        insights: new InsightRepository() as any,
        posts: new PostRepository() as any,
        scheduledPosts: new ScheduledPostRepository() as any
      };
      
      this.initialized = true;
      console.log('✅ Drizzle adapter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Drizzle adapter:', error);
      throw error;
    }
  }

  /**
   * Get all repositories
   */
  getRepositories(): IRepositorySet {
    if (!this.repositories) {
      throw new Error('Drizzle adapter not initialized. Call initialize() first.');
    }
    return this.repositories;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    closeDatabase();
    this.repositories = null;
    this.initialized = false;
  }

  /**
   * Run migrations
   */
  async migrate(): Promise<void> {
    runMigrations();
  }

  /**
   * Reset database (for testing)
   */
  async reset(): Promise<void> {
    resetDatabase();
  }

  /**
   * Get adapter name
   */
  getName(): string {
    return 'drizzle';
  }
}