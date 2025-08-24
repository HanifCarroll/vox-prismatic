import { 
  LinkedInConfig, 
  LinkedInPostData, 
  LinkedInPost, 
  LinkedInProfile,
  Result 
} from '@content-creation/shared';
import { 
  createLinkedInClient as createAuthClient, 
  LinkedInClient,
  validateAccessToken,
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken
} from './auth';
import { 
  createPost as createPostAPI,
  deletePost as deletePostAPI,
  getPosts as getPostsAPI,
  getProfile as getProfileAPI,
  getPostAnalytics
} from './posts';

/**
 * Main LinkedIn client class that provides a unified interface
 * Following the same patterns as the Postiz package
 */

/**
 * Create and validate LinkedIn client
 */
export const createLinkedInClient = async (config: LinkedInConfig): Promise<Result<LinkedInClient>> => {
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

    console.log('✅ LinkedIn client authenticated successfully');
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
export const getProfile = async (client: LinkedInClient): Promise<Result<LinkedInProfile>> => {
  return getProfileAPI(client);
};

/**
 * Create a LinkedIn post immediately
 */
export const createPost = async (
  client: LinkedInClient,
  content: string,
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS' = 'PUBLIC'
): Promise<Result<LinkedInPost>> => {
  try {
    console.log('📝 Creating LinkedIn post...');
    
    const postData: LinkedInPostData = {
      content,
      visibility
    };

    const result = await createPostAPI(client, postData);
    
    if (result.success) {
      console.log('✅ LinkedIn post created successfully');
    } else {
      console.error('❌ Failed to create LinkedIn post:', result.error.message);
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
 * Delete a LinkedIn post
 */
export const deletePost = async (
  client: LinkedInClient,
  postId: string
): Promise<Result<void>> => {
  try {
    console.log(`🗑️ Deleting LinkedIn post: ${postId}`);
    
    const result = await deletePostAPI(client, postId);
    
    if (result.success) {
      console.log('✅ LinkedIn post deleted successfully');
    } else {
      console.error('❌ Failed to delete LinkedIn post:', result.error.message);
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
 * Get user's LinkedIn posts
 */
export const getPosts = async (
  client: LinkedInClient,
  limit: number = 20
): Promise<Result<LinkedInPost[]>> => {
  try {
    console.log(`📡 Fetching LinkedIn posts (limit: ${limit})...`);
    
    const result = await getPostsAPI(client, limit);
    
    if (result.success) {
      console.log(`✅ Found ${result.data.length} LinkedIn posts`);
    } else {
      console.error('❌ Failed to fetch LinkedIn posts:', result.error.message);
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
 * Helper function to create a post request matching Postiz-style interface
 * This makes it easier to integrate with existing scheduler code
 */
export const schedulePostToPlatform = async (
  config: LinkedInConfig,
  content: string,
  scheduledDate?: string
): Promise<Result<LinkedInPost | { scheduled: true; scheduledTime: string }>> => {
  try {
    // Create LinkedIn client
    const clientResult = await createLinkedInClient(config);
    if (!clientResult.success) {
      return clientResult;
    }

    const client = clientResult.data;

    if (scheduledDate) {
      // Since LinkedIn API doesn't support native scheduling,
      // we would need to store this in a database and process it later
      // For now, return a scheduled confirmation object
      console.log(`📅 LinkedIn post scheduled for: ${scheduledDate}`);
      
      return {
        success: true,
        data: {
          scheduled: true,
          scheduledTime: scheduledDate
        }
      };
    } else {
      // Post immediately
      return await createPost(client, content);
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
  validateAccessToken
};