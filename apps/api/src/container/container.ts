/**
 * Dependency Injection Container
 * Manages service creation and dependency resolution
 */

import { PrismaClient } from '../database/prisma/generated/client';
import { PrismaAdapter } from '../database/prisma/PrismaAdapter';
import {
  PrismaPostRepository,
  PrismaScheduledPostRepository,
  PrismaInsightRepository,
  PrismaTranscriptRepository,
} from '../database/prisma/repositories';
import type {
  IPostRepository,
  IScheduledPostRepository,
  IInsightRepository,
  ITranscriptRepository,
} from '../database/interfaces';
import type { 
  IDependencyContainer, 
  IServiceDependencies,
  IDatabaseDependencies 
} from './types';
import { DatabaseConnectionError } from '../errors/domain-errors';

// Import services (these will be refactored next)
import { PostService } from '../services/post-service';
import { SchedulingService } from '../services/scheduling-service';
import { InsightService } from '../services/insight-service';
import { TranscriptService } from '../services/transcript-service';

/**
 * Production dependency injection container
 * Manages real service instances with proper lifecycle
 */
export class DependencyContainer implements IDependencyContainer {
  private static instance: DependencyContainer | null = null;
  private prismaClient: PrismaClient | null = null;
  private repositories: IDatabaseDependencies['postRepository'] | null = null;
  private isInitialized = false;

  // Repository instances (lazy-loaded)
  private postRepository: IPostRepository | null = null;
  private scheduledPostRepository: IScheduledPostRepository | null = null;
  private insightRepository: IInsightRepository | null = null;
  private transcriptRepository: ITranscriptRepository | null = null;

  // Service instances (cached for singleton behavior)
  private postService: PostService | null = null;
  private schedulingService: SchedulingService | null = null;
  private insightService: InsightService | null = null;
  private transcriptService: TranscriptService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  /**
   * Initialize the container and database connection
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Prisma client
      this.prismaClient = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });

      // Test connection
      await this.prismaClient.$connect();
      await this.prismaClient.$queryRaw`SELECT 1`;

      this.isInitialized = true;
      console.log('Dependency container initialized successfully');
    } catch (error) {
      throw new DatabaseConnectionError(
        error instanceof Error ? error.message : 'Failed to connect to database'
      );
    }
  }

  /**
   * Shutdown and cleanup resources
   */
  public async shutdown(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
    }

    // Clear cached instances
    this.postRepository = null;
    this.scheduledPostRepository = null;
    this.insightRepository = null;
    this.transcriptRepository = null;
    this.postService = null;
    this.schedulingService = null;
    this.insightService = null;
    this.transcriptService = null;

    this.isInitialized = false;
    console.log('Dependency container shut down');
  }

  /**
   * Get Prisma client (ensures initialized)
   */
  private getPrismaClient(): PrismaClient {
    if (!this.prismaClient || !this.isInitialized) {
      throw new DatabaseConnectionError('Container not initialized. Call initialize() first.');
    }
    return this.prismaClient;
  }

  // Repository getters (lazy initialization)

  public getPostRepository(): IPostRepository {
    if (!this.postRepository) {
      this.postRepository = new PrismaPostRepository(this.getPrismaClient());
    }
    return this.postRepository;
  }

  public getScheduledPostRepository(): IScheduledPostRepository {
    if (!this.scheduledPostRepository) {
      this.scheduledPostRepository = new PrismaScheduledPostRepository(this.getPrismaClient());
    }
    return this.scheduledPostRepository;
  }

  public getInsightRepository(): IInsightRepository {
    if (!this.insightRepository) {
      this.insightRepository = new PrismaInsightRepository(this.getPrismaClient());
    }
    return this.insightRepository;
  }

  public getTranscriptRepository(): ITranscriptRepository {
    if (!this.transcriptRepository) {
      this.transcriptRepository = new PrismaTranscriptRepository(this.getPrismaClient());
    }
    return this.transcriptRepository;
  }

  // Service factory methods

  public createPostService(): PostService {
    if (!this.postService) {
      const dependencies: IServiceDependencies = {
        repositories: {
          post: this.getPostRepository(),
          scheduledPost: this.getScheduledPostRepository(),
          insight: this.getInsightRepository(),
          transcript: this.getTranscriptRepository(),
        },
      };
      // TODO: Update PostService constructor to accept dependencies
      // For now, return existing implementation
      this.postService = new PostService();
    }
    return this.postService;
  }

  public createSchedulingService(): SchedulingService {
    if (!this.schedulingService) {
      const dependencies: IServiceDependencies = {
        repositories: {
          post: this.getPostRepository(),
          scheduledPost: this.getScheduledPostRepository(),
          insight: this.getInsightRepository(),
          transcript: this.getTranscriptRepository(),
        },
      };
      // TODO: Update SchedulingService constructor to accept dependencies
      this.schedulingService = new SchedulingService();
    }
    return this.schedulingService;
  }

  public createInsightService(): InsightService {
    if (!this.insightService) {
      const dependencies: IServiceDependencies = {
        repositories: {
          post: this.getPostRepository(),
          scheduledPost: this.getScheduledPostRepository(),
          insight: this.getInsightRepository(),
          transcript: this.getTranscriptRepository(),
        },
      };
      // TODO: Update InsightService constructor to accept dependencies
      this.insightService = new InsightService();
    }
    return this.insightService;
  }

  public createTranscriptService(): TranscriptService {
    if (!this.transcriptService) {
      const dependencies: IServiceDependencies = {
        repositories: {
          post: this.getPostRepository(),
          scheduledPost: this.getScheduledPostRepository(),
          insight: this.getInsightRepository(),
          transcript: this.getTranscriptRepository(),
        },
      };
      // TODO: Update TranscriptService constructor to accept dependencies
      this.transcriptService = new TranscriptService();
    }
    return this.transcriptService;
  }
}

/**
 * Test container for unit testing
 * Allows injection of mock dependencies
 */
export class TestContainer implements IDependencyContainer {
  constructor(
    private repositories: {
      post: IPostRepository;
      scheduledPost: IScheduledPostRepository;
      insight: IInsightRepository;
      transcript: ITranscriptRepository;
    },
    private services?: {
      post?: PostService;
      scheduling?: SchedulingService;
      insight?: InsightService;
      transcript?: TranscriptService;
    }
  ) {}

  async initialize(): Promise<void> {
    // No-op for test container
  }

  async shutdown(): Promise<void> {
    // No-op for test container
  }

  getPostRepository(): IPostRepository {
    return this.repositories.post;
  }

  getScheduledPostRepository(): IScheduledPostRepository {
    return this.repositories.scheduledPost;
  }

  getInsightRepository(): IInsightRepository {
    return this.repositories.insight;
  }

  getTranscriptRepository(): ITranscriptRepository {
    return this.repositories.transcript;
  }

  createPostService(): PostService {
    return this.services?.post || new PostService();
  }

  createSchedulingService(): SchedulingService {
    return this.services?.scheduling || new SchedulingService();
  }

  createInsightService(): InsightService {
    return this.services?.insight || new InsightService();
  }

  createTranscriptService(): TranscriptService {
    return this.services?.transcript || new TranscriptService();
  }
}

// Export singleton getter for production use
let containerInstance: DependencyContainer | null = null;

export async function getContainer(): Promise<DependencyContainer> {
  if (!containerInstance) {
    containerInstance = DependencyContainer.getInstance();
    await containerInstance.initialize();
  }
  return containerInstance;
}

// Export for testing
export function setTestContainer(container: TestContainer): void {
  containerInstance = container as any;
}