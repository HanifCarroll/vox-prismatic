// Result type for functional programming patterns
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Import ScheduledPost from database package
import { ScheduledPostRecord } from '@content-creation/database';
import { getReadyPosts, markPostAsPublished, markPostAsFailed, retryPost } from './scheduler';

/**
 * Background job processor for scheduled posts
 * Handles publishing posts to LinkedIn and X using direct API integration
 */

export interface ProcessorConfig {
  linkedin?: any;  // LinkedInConfig
  x?: any;         // XConfig  
  maxConcurrent?: number;
  retryDelay?: number;  // milliseconds
  // Optional platform handlers for dependency injection
  platformHandlers?: {
    linkedin?: (config: any, content: string) => Promise<Result<any>>;
    x?: (config: any, content: string) => Promise<Result<any>>;
    instagram?: (config: any, content: string) => Promise<Result<any>>;
    facebook?: (config: any, content: string) => Promise<Result<any>>;
  };
}

/**
 * Process a single scheduled post
 */
export const processPost = async (
  post: ScheduledPostRecord,
  config: ProcessorConfig
): Promise<Result<void>> => {
  try {
    console.log(`🚀 Processing ${post.platform} post: ${post.id}`);
    console.log(`📝 Content: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`);

    let result: Result<any>;

    // Check if custom handlers are provided
    if (config.platformHandlers && config.platformHandlers[post.platform]) {
      const handler = config.platformHandlers[post.platform]!;
      const platformConfig = (config as any)[post.platform];
      result = await handler(platformConfig, post.content);
    } else {
      // Use default implementations
      switch (post.platform) {
        case 'linkedin':
          result = await processLinkedInPost(post, config.linkedin);
          break;
        case 'x':
          result = await processXPost(post, config.x);
          break;
        case 'instagram':
        case 'facebook':
          return {
            success: false,
            error: new Error(`Platform ${post.platform} not yet implemented. Currently supported: linkedin, x`)
          };
        default:
          return {
            success: false,
            error: new Error(`Unsupported platform: ${post.platform}. Supported platforms: linkedin, x`)
          };
      }
    }

    if (result.success) {
      // Mark as published
      const markResult = markPostAsPublished(post.id);
      if (!markResult.success) {
        console.error(`Failed to mark post as published: ${markResult.error.message}`);
      }
      
      console.log(`✅ Successfully published ${post.platform} post: ${post.id}`);
      return { success: true, data: undefined };
    } else {
      // Handle failure
      const errorMessage = result.error.message;
      console.error(`❌ Failed to publish ${post.platform} post: ${errorMessage}`);
      
      // Increment retry count or mark as failed
      if (post.retryCount >= 2) {
        markPostAsFailed(post.id, errorMessage);
        console.log(`💀 Post ${post.id} marked as permanently failed`);
      } else {
        retryPost(post.id);
        console.log(`🔄 Post ${post.id} scheduled for retry`);
      }
      
      return result;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Unexpected error processing post ${post.id}:`, errorMessage);
    
    markPostAsFailed(post.id, errorMessage);
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Process LinkedIn post
 */
const processLinkedInPost = async (
  post: ScheduledPostRecord,
  config: any
): Promise<Result<any>> => {
  if (!config) {
    return {
      success: false,
      error: new Error('LinkedIn configuration not provided')
    };
  }

  try {
    // Dynamic import to avoid TypeScript module resolution at compile time
    const { createLinkedInClient, createPost } = await import('@content-creation/linkedin');
    
    // Create LinkedIn client
    const clientResult = await createLinkedInClient(config);
    if (!clientResult.success) {
      return clientResult;
    }

    const client = clientResult.data;
    
    // Post immediately (scheduling was already handled by our scheduler)
    const result = await createPost(client, post.content);
    
    return {
      success: result.success,
      data: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error
    } as Result<any>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(`LinkedIn processing failed: ${String(error)}`)
    };
  }
};

/**
 * Process X/Twitter post
 */
const processXPost = async (
  post: ScheduledPostRecord,
  config: any
): Promise<Result<any>> => {
  if (!config) {
    return {
      success: false,
      error: new Error('X configuration not provided')
    };
  }

  try {
    // Dynamic import to avoid TypeScript module resolution at compile time
    const { createXClient, createPostOrThread } = await import('@content-creation/x');

    // Create X client
    const clientResult = await createXClient(config);
    if (!clientResult.success) {
      return clientResult;
    }

    const client = clientResult.data;
    
    // Use createPostOrThread to handle long content automatically
    const result = await createPostOrThread(client, post.content);
    
    return {
      success: result.success,
      data: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error
    } as Result<any>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(`X processing failed: ${String(error)}`)
    };
  }
};


/**
 * Process all ready posts
 */
export const processReadyPosts = async (
  config: ProcessorConfig
): Promise<Result<{ processed: number; succeeded: number; failed: number }>> => {
  try {
    const readyPostsResult = getReadyPosts(config.maxConcurrent || 10);
    if (!readyPostsResult.success) {
      return readyPostsResult;
    }

    const posts = readyPostsResult.data;
    
    if (posts.length === 0) {
      console.log('📭 No posts ready for publishing');
      return {
        success: true,
        data: { processed: 0, succeeded: 0, failed: 0 }
      };
    }

    console.log(`📬 Processing ${posts.length} ready posts...`);

    let succeeded = 0;
    let failed = 0;

    // Process posts with concurrency control
    const maxConcurrent = config.maxConcurrent || 3;
    const chunks: ScheduledPostRecord[][] = [];
    
    for (let i = 0; i < posts.length; i += maxConcurrent) {
      chunks.push(posts.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(post => processPost(post, config));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          succeeded++;
        } else {
          failed++;
          const post = chunk[index];
          const error = result.status === 'rejected' 
            ? result.reason 
            : !result.value.success ? result.value.error : undefined;
          console.error(`Failed to process post ${post.id}:`, error);
        }
      });

      // Add delay between chunks to avoid overwhelming APIs
      if (config.retryDelay && chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }

    const stats = { processed: posts.length, succeeded, failed };
    console.log(`📊 Processing complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      success: true,
      data: stats
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Single processor run (for cron jobs)
 */
export const runProcessor = async (config: ProcessorConfig): Promise<void> => {
  try {
    console.log('🔄 Starting scheduled post processor...');
    
    const result = await processReadyPosts(config);
    
    if (result.success) {
      const { processed, succeeded, failed } = result.data;
      if (processed > 0) {
        console.log(`✅ Processor run complete: ${succeeded} succeeded, ${failed} failed`);
      }
    } else {
      console.error('❌ Processor run failed:', result.error.message);
    }
  } catch (error) {
    console.error('💥 Unexpected processor error:', error);
  }
};

/**
 * Start continuous processor (runs every N minutes)
 */
export const startContinuousProcessor = (
  config: ProcessorConfig,
  intervalMinutes: number = 5
): () => void => {
  console.log(`🚀 Starting continuous processor (every ${intervalMinutes} minutes)`);
  
  // Run immediately
  runProcessor(config);
  
  // Set up interval
  const interval = setInterval(() => {
    runProcessor(config);
  }, intervalMinutes * 60 * 1000);

  // Return stop function
  return () => {
    console.log('⏹️ Stopping continuous processor');
    clearInterval(interval);
  };
};