import { 
  XConfig, 
  XTweetData, 
  XTweet, 
  XProfile,
  Result,
  SocialMediaClient
} from '../types/social-media';
import { 
  createXClient as createAuthClient, 
  XClient,
  validateAccessToken,
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  generateAppOnlyToken,
  generatePKCECodes
} from './auth';
import { 
  createTweet as createTweetAPI,
  createThread as createThreadAPI,
  deleteTweet as deleteTweetAPI,
  getTweets as getTweetsAPI,
  getProfile as getProfileAPI,
  getTweetAnalytics,
  uploadMedia
} from './tweets';

/**
 * Main X/Twitter client class that provides a unified interface
 * Following the SocialMediaClient interface pattern
 */

export class XSocialClient implements SocialMediaClient {
  public readonly platform = 'x' as const;
  private client: XClient;

  constructor(private config: XConfig) {
    const clientResult = createAuthClient(config);
    if (!clientResult.success) {
      throw clientResult.error;
    }
    this.client = clientResult.data;
  }

  get isAuthenticated(): boolean {
    return !!this.client.accessToken;
  }

  async post(content: string, options?: { 
    replyTo?: string; 
    quoteTweetId?: string; 
    mediaIds?: string[] 
  }): Promise<Result<XTweet>> {
    return this.createTweet(content, options);
  }

  async getProfile(): Promise<Result<XProfile>> {
    return getProfileAPI(this.client);
  }

  async deletePost(tweetId: string): Promise<Result<void>> {
    return deleteTweetAPI(this.client, tweetId);
  }

  async createTweet(
    text: string,
    options?: {
      replyTo?: string;
      quoteTweetId?: string;
      mediaIds?: string[];
    }
  ): Promise<Result<XTweet>> {
    try {
      console.log('🐦 Creating tweet...');
      
      const tweetData: XTweetData = {
        text,
        ...options
      };

      const result = await createTweetAPI(this.client, tweetData);
      
      if (result.success) {
        console.log('✅ Tweet created successfully');
      } else {
        console.error('❌ Failed to create tweet:', result.error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async createThread(tweets: string[]): Promise<Result<XTweet[]>> {
    try {
      console.log(`🧵 Creating thread with ${tweets.length} tweets...`);
      
      const result = await createThreadAPI(this.client, tweets);
      
      if (result.success) {
        console.log(`✅ Thread created successfully with ${result.data.length} tweets`);
      } else {
        console.error('❌ Failed to create thread:', result.error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async getTweets(maxResults: number = 20): Promise<Result<XTweet[]>> {
    try {
      console.log(`📡 Fetching tweets (limit: ${maxResults})...`);
      
      const result = await getTweetsAPI(this.client, undefined, maxResults);
      
      if (result.success) {
        console.log(`✅ Found ${result.data.length} tweets`);
      } else {
        console.error('❌ Failed to fetch tweets:', result.error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async validateToken(): Promise<Result<boolean>> {
    return validateAccessToken(this.client);
  }

  async uploadMedia(mediaData: Buffer, mediaType: string) {
    return uploadMedia(this.client, mediaData, mediaType);
  }
}

/**
 * Create and validate X client
 */
export const createXClient = async (config: XConfig): Promise<Result<XSocialClient>> => {
  try {
    const client = new XSocialClient(config);

    // Validate access token
    const validationResult = await client.validateToken();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('✅ X client authenticated successfully');
    return {
      success: true,
      data: client
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Helper function to create a post or thread based on content length
 * Automatically splits long content into threads
 */
export const createPostOrThread = async (
  config: XConfig,
  content: string,
  options?: {
    maxTweetLength?: number;
    replyTo?: string;
    mediaIds?: string[];
  }
): Promise<Result<XTweet | XTweet[]>> => {
  try {
    const maxLength = options?.maxTweetLength || 280;
    
    // Create X client
    const clientResult = await createXClient(config);
    if (!clientResult.success) {
      return clientResult;
    }

    const client = clientResult.data;

    // If content fits in a single tweet, create one tweet
    if (content.length <= maxLength) {
      return await client.createTweet(content, {
        replyTo: options?.replyTo,
        mediaIds: options?.mediaIds
      });
    }

    // Split content into multiple tweets for a thread
    const tweets: string[] = [];
    const words = content.split(' ');
    let currentTweet = '';

    for (const word of words) {
      const testTweet = currentTweet ? `${currentTweet} ${word}` : word;
      
      if (testTweet.length <= maxLength - 10) { // Leave room for thread indicators
        currentTweet = testTweet;
      } else {
        if (currentTweet) {
          tweets.push(currentTweet);
          currentTweet = word;
        } else {
          // Single word is too long, truncate it
          tweets.push(word.substring(0, maxLength - 10));
          currentTweet = '';
        }
      }
    }

    if (currentTweet) {
      tweets.push(currentTweet);
    }

    // Add thread indicators
    const threadTweets = tweets.map((tweet, index) => 
      tweets.length > 1 ? `${tweet} ${index + 1}/${tweets.length}` : tweet
    );

    const result = await client.createThread(threadTweets);
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Helper function to create a post request matching Postiz-style interface
 * This makes it easier to integrate with existing scheduler code
 */
export const schedulePostToPlatform = async (
  config: XConfig,
  content: string,
  scheduledDate?: string
): Promise<Result<XTweet | XTweet[] | { scheduled: true; scheduledTime: string }>> => {
  try {
    if (scheduledDate) {
      // Since X API doesn't support native scheduling for all accounts,
      // we return a scheduled confirmation object
      // The actual posting will be handled by the scheduler service
      console.log(`📅 X post scheduled for: ${scheduledDate}`);
      
      return {
        success: true,
        data: {
          scheduled: true,
          scheduledTime: scheduledDate
        }
      };
    } else {
      // Post immediately
      return await createPostOrThread(config, content);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

// Export authentication utilities for manual token management
export {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  generateAppOnlyToken,
  validateAccessToken,
  generatePKCECodes
};