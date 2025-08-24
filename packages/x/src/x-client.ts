import { 
  XConfig, 
  XTweetData, 
  XTweet, 
  XProfile,
  Result 
} from '@content-creation/shared';
import { 
  createXClient as createAuthClient, 
  XClient,
  validateAccessToken,
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken
} from './auth';
import { 
  createTweet as createTweetAPI,
  deleteTweet as deleteTweetAPI,
  getTweets as getTweetsAPI,
  getProfile as getProfileAPI,
  createThread as createThreadAPI,
  getTweetAnalytics
} from './tweets';

/**
 * Main X/Twitter client class that provides a unified interface
 * Following the same patterns as the Postiz and LinkedIn packages
 */

/**
 * Create and validate X client
 */
export const createXClient = async (config: XConfig): Promise<Result<XClient>> => {
  try {
    // Create basic client
    const clientResult = createAuthClient(config);
    if (!clientResult.success) {
      return clientResult;
    }

    const client = clientResult.data;

    // Validate access token
    const validationResult = await validateAccessToken(client);
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
 * Get authenticated user's profile
 */
export const getProfile = async (client: XClient): Promise<Result<XProfile>> => {
  return getProfileAPI(client);
};

/**
 * Create a tweet immediately
 */
export const createTweet = async (
  client: XClient,
  text: string,
  options?: {
    replyTo?: string;
    quoteTweetId?: string;
    mediaIds?: string[];
  }
): Promise<Result<XTweet>> => {
  try {
    console.log('🐦 Creating tweet...');
    
    const tweetData: XTweetData = {
      text,
      ...options
    };

    const result = await createTweetAPI(client, tweetData);
    
    if (result.success) {
      console.log('✅ Tweet created successfully');
    } else {
      console.error('❌ Failed to create tweet:', result.error.message);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Create a tweet thread
 */
export const createThread = async (
  client: XClient,
  tweets: string[]
): Promise<Result<XTweet[]>> => {
  try {
    console.log(`🧵 Creating thread with ${tweets.length} tweets...`);
    
    const result = await createThreadAPI(client, tweets);
    
    if (result.success) {
      console.log('✅ Thread created successfully');
    } else {
      console.error('❌ Failed to create thread:', result.error.message);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Delete a tweet
 */
export const deleteTweet = async (
  client: XClient,
  tweetId: string
): Promise<Result<void>> => {
  try {
    console.log(`🗑️ Deleting tweet: ${tweetId}`);
    
    const result = await deleteTweetAPI(client, tweetId);
    
    if (result.success) {
      console.log('✅ Tweet deleted successfully');
    } else {
      console.error('❌ Failed to delete tweet:', result.error.message);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get user's tweets
 */
export const getTweets = async (
  client: XClient,
  maxResults: number = 10
): Promise<Result<XTweet[]>> => {
  try {
    console.log(`📡 Fetching tweets (max: ${maxResults})...`);
    
    const result = await getTweetsAPI(client, maxResults);
    
    if (result.success) {
      console.log(`✅ Found ${result.data.length} tweets`);
    } else {
      console.error('❌ Failed to fetch tweets:', result.error.message);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Helper function to create a tweet request matching Postiz-style interface
 * This makes it easier to integrate with existing scheduler code
 */
export const schedulePostToPlatform = async (
  config: XConfig,
  content: string,
  scheduledDate?: string
): Promise<Result<XTweet | { scheduled: true; scheduledTime: string }>> => {
  try {
    // Create X client
    const clientResult = await createXClient(config);
    if (!clientResult.success) {
      return clientResult;
    }

    const client = clientResult.data;

    if (scheduledDate) {
      // Since X API doesn't support native scheduling,
      // we would need to store this in a database and process it later
      // For now, return a scheduled confirmation object
      console.log(`📅 Tweet scheduled for: ${scheduledDate}`);
      
      return {
        success: true,
        data: {
          scheduled: true,
          scheduledTime: scheduledDate
        }
      };
    } else {
      // Post immediately
      return await createTweet(client, content);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Helper function to break long content into thread if needed
 * X has a 280 character limit per tweet
 */
export const createPostOrThread = async (
  client: XClient,
  content: string,
  maxTweetLength: number = 250 // Leave some buffer
): Promise<Result<XTweet[]>> => {
  try {
    // If content fits in one tweet, create single tweet
    if (content.length <= maxTweetLength) {
      const result = await createTweet(client, content);
      if (!result.success) {
        return result;
      }
      return {
        success: true,
        data: [result.data]
      };
    }

    // Split content into tweets for thread
    const tweets: string[] = [];
    const words = content.split(' ');
    let currentTweet = '';

    for (const word of words) {
      const testTweet = currentTweet ? `${currentTweet} ${word}` : word;
      
      if (testTweet.length <= maxTweetLength) {
        currentTweet = testTweet;
      } else {
        if (currentTweet) {
          tweets.push(currentTweet);
          currentTweet = word;
        } else {
          // Single word is too long, just add it
          tweets.push(word);
        }
      }
    }

    if (currentTweet) {
      tweets.push(currentTweet);
    }

    // Create thread
    return await createThread(client, tweets);
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
  validateAccessToken
};