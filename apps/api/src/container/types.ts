/**
 * Dependency injection container types and interfaces
 * Provides proper abstraction for service dependencies
 */

import type {
  IPostRepository,
  IScheduledPostRepository,
  IInsightRepository,
  ITranscriptRepository
} from '../database/interfaces';
import type { PrismaClient } from '../database/prisma/generated/client';

/**
 * Database dependencies interface
 */
export interface IDatabaseDependencies {
  client: PrismaClient;
  postRepository: IPostRepository;
  scheduledPostRepository: IScheduledPostRepository;
  insightRepository: IInsightRepository;
  transcriptRepository: ITranscriptRepository;
}

/**
 * Service dependencies interface
 * All dependencies a service might need
 */
export interface IServiceDependencies {
  // Repositories
  repositories: {
    post: IPostRepository;
    scheduledPost: IScheduledPostRepository;
    insight: IInsightRepository;
    transcript: ITranscriptRepository;
  };
  
  // External services (can be mocked for testing)
  external?: {
    aiService?: any; // Will be typed properly when AI service is refactored
    emailService?: any;
    notificationService?: any;
  };
  
  // Configuration
  config?: {
    apiUrl?: string;
    environment?: string;
    features?: Record<string, boolean>;
  };
}

/**
 * Minimal dependencies for basic services
 */
export interface IBasicServiceDependencies {
  repositories: Pick<IServiceDependencies['repositories'], 'post' | 'scheduledPost'>;
}

/**
 * Container interface for dependency resolution
 */
export interface IDependencyContainer {
  // Repository getters
  getPostRepository(): IPostRepository;
  getScheduledPostRepository(): IScheduledPostRepository;
  getInsightRepository(): IInsightRepository;
  getTranscriptRepository(): ITranscriptRepository;
  
  // Service factory methods
  createPostService(): any; // Will be properly typed when services are refactored
  createSchedulingService(): any;
  createInsightService(): any;
  createTranscriptService(): any;
  
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}