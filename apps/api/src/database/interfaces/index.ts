/**
 * Database Interface Exports
 * Central export point for all repository interfaces
 */

export type { IRepository, BaseFilter } from './IRepository';
export type { ITranscriptRepository } from './ITranscriptRepository';
export type { IInsightRepository } from './IInsightRepository';
export type { IPostRepository } from './IPostRepository';
export type { IScheduledPostRepository } from './IScheduledPostRepository';

/**
 * Repository Set Interface
 * Defines the collection of all repositories
 */
export interface IRepositorySet {
  transcripts: ITranscriptRepository;
  insights: IInsightRepository;
  posts: IPostRepository;
  scheduledPosts: IScheduledPostRepository;
}

/**
 * Database Adapter Interface
 * Defines the contract for database adapters
 */
export interface IDatabaseAdapter {
  /**
   * Initialize the database connection and run migrations
   */
  initialize(): Promise<void>;

  /**
   * Get all repositories
   */
  getRepositories(): IRepositorySet;

  /**
   * Close database connection
   */
  close(): Promise<void>;

  /**
   * Run migrations
   */
  migrate(): Promise<void>;

  /**
   * Reset database (for testing)
   */
  reset?(): Promise<void>;

  /**
   * Get adapter name
   */
  getName(): string;
}