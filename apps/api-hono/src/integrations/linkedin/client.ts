import { 
  LinkedInConfig, 
  LinkedInPostData, 
  LinkedInPost, 
  LinkedInProfile,
  Result,
  SocialMediaClient
} from '../types/social-media';
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
 * Following the SocialMediaClient interface pattern
 */

export class LinkedInSocialClient implements SocialMediaClient {
  public readonly platform = 'linkedin' as const;
  private client: LinkedInClient;

  constructor(private config: LinkedInConfig) {
    const clientResult = createAuthClient(config);
    if (!clientResult.success) {
      throw clientResult.error;
    }
    this.client = clientResult.data;
  }

  get isAuthenticated(): boolean {
    return !!this.client.accessToken;
  }

  async post(content: string, options?: { visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS' }): Promise<Result<LinkedInPost>> {
    return this.createPost(content, options?.visibility);
  }

  async getProfile(): Promise<Result<LinkedInProfile>> {
    return getProfileAPI(this.client);
  }

  async deletePost(postId: string): Promise<Result<void>> {
    return deletePostAPI(this.client, postId);
  }

  async createPost(
    content: string, 
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS' = 'PUBLIC'
  ): Promise<Result<LinkedInPost>> {
    try {
      console.log('📝 Creating LinkedIn post...');
      
      const postData: LinkedInPostData = {
        content,
        visibility
      };

      const result = await createPostAPI(this.client, postData);
      
      if (result.success) {
        console.log('✅ LinkedIn post created successfully');
      } else {
        console.error('❌ Failed to create LinkedIn post:', result.error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async getPosts(limit: number = 20): Promise<Result<LinkedInPost[]>> {
    try {
      console.log(`📡 Fetching LinkedIn posts (limit: ${limit})...`);
      
      const result = await getPostsAPI(this.client, limit);
      
      if (result.success) {
        console.log(`✅ Found ${result.data.length} LinkedIn posts`);
      } else {
        console.error('❌ Failed to fetch LinkedIn posts:', result.error);
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
}

/**
 * Create and validate LinkedIn client
 */
export const createLinkedInClient = async (config: LinkedInConfig): Promise<Result<LinkedInSocialClient>> => {
  try {
    const client = new LinkedInSocialClient(config);

    // Validate access token
    const validationResult = await client.validateToken();
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
      // we return a scheduled confirmation object
      // The actual posting will be handled by the scheduler service
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
      return await client.createPost(content);
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