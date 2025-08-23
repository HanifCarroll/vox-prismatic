import Postiz from '@postiz/node';
import { PostizConfig, PostizIntegration, PostizPost, Result } from './types.ts';

/**
 * Functional Postiz API operations using the official SDK
 */

/**
 * Creates a Postiz SDK client
 */
const createPostizClient = (config: PostizConfig): Postiz => {
  // Use the full URL from config - it now includes /api/
  const baseUrl = config.baseUrl; // https://postiz.hanifcarroll.com/api/
  
  // Create and return the Postiz client
  return new Postiz(config.apiKey, baseUrl);
};

/**
 * Gets all connected integrations (channels) from Postiz
 */
export const getIntegrations = async (config: PostizConfig): Promise<Result<PostizIntegration[]>> => {
  try {
    const client = createPostizClient(config);
    const integrations = await client.integrations();
    
    return { success: true, data: (integrations as PostizIntegration[]) || [] };
  } catch (error) {
    console.error(`❌ Failed to get integrations:`, error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Gets scheduled and published posts from Postiz within a date range
 */
export const getPosts = async (
  config: PostizConfig, 
  startDate?: string, 
  endDate?: string,
  silent: boolean = false  // Add silent parameter to control logging
): Promise<Result<any>> => {
  try {
    if (!silent) {
      console.log(`📡 Fetching posts from Postiz...`);
    }
    const client = createPostizClient(config);
    
    // Use date range if provided, otherwise get posts from the past month to future month
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    
    const response = await client.postList({
      startDate: start,
      endDate: end
    });
    
    // According to API docs, response should be { posts: [...] }
    const posts = (response as any)?.posts || [];
    
    if (!silent) {
      console.log(`✅ Found ${posts.length} posts`);
    }
    
    return { success: true, data: { posts } };
  } catch (error) {
    console.error(`❌ Failed to get posts:`, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Gets only scheduled (future) posts from Postiz
 */
export const getScheduledPosts = async (config: PostizConfig): Promise<Result<any[]>> => {
  try {
    console.log(`📡 Fetching scheduled posts from Postiz...`);
    
    // Get posts from now to 30 days in the future
    const now = new Date();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const postsResult = await getPosts(config, now.toISOString(), futureDate.toISOString(), true);  // Pass silent=true
    if (!postsResult.success) {
      return postsResult;
    }
    
    // Filter for only scheduled posts (state === 'QUEUE')
    const scheduledPosts = postsResult.data.posts?.filter((post: any) => {
      return post.state === 'QUEUE' && new Date(post.publishDate) > now;
    }) || [];
    
    console.log(`✅ Found ${scheduledPosts.length} scheduled posts`);
    
    return { success: true, data: scheduledPosts };
  } catch (error) {
    console.error(`❌ Failed to get scheduled posts:`, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Creates a new post in Postiz using the SDK
 */
export const createPost = async (
  config: PostizConfig,
  postData: any
): Promise<Result<any>> => {
  try {
    const client = createPostizClient(config);
    const result = await client.post(postData);
    
    // Check if the response indicates an error
    if (result && result.error) {
      return {
        success: false,
        error: new Error(`Postiz API error: ${result.message?.join(', ') || result.error}`)
      };
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ Failed to create post:`, error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Deletes a post from Postiz
 */
export const deletePost = async (
  config: PostizConfig,
  postId: string
): Promise<Result<void>> => {
  try {
    console.log(`🗑️ Deleting post: ${postId}`);
    const client = createPostizClient(config);
    
    await client.deletePost(postId);
    console.log(`✅ Post deleted successfully`);
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error(`❌ Failed to delete post:`, error);
    return {
      success: false,
      error: error as Error
    };
  }
};

/**
 * Helper function to find integration by provider (linkedin, x, etc.)
 */
export const findIntegrationByProvider = (
  integrations: PostizIntegration[],
  provider: string
): PostizIntegration | null => {
  // Map platform names to provider identifiers (based on actual API response)
  const providerMap: Record<string, string> = {
    'linkedin': 'linkedin',
    'x': 'x',
    'twitter': 'x' // Alternative name for X
  };
  
  const targetProvider = providerMap[provider.toLowerCase()] || provider.toLowerCase();
  
  // Use 'identifier' field which is what the actual API returns
  return integrations.find(integration => 
    integration.identifier?.toLowerCase() === targetProvider
  ) || null;
};

/**
 * Helper function to create a post request matching official Postiz API format
 */
export const createPostRequest = (
  integrationId: string,
  content: string,
  scheduledDate?: string
) => {
  // Use the exact format from Postiz documentation with all required fields
  const postData: any = {
    type: scheduledDate ? "schedule" : "now",
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: {
          id: integrationId
        },
        value: [
          {
            content: content.trim(),
            image: []
          }
        ]
      }
    ]
  };
  
  // Add scheduling date if provided
  if (scheduledDate) {
    const scheduleDate = new Date(scheduledDate);
    postData.date = scheduleDate.toISOString();
  }
  
  return postData;
};

/**
 * Schedules a post to a specific platform through Postiz SDK
 */
export const schedulePostToPlatform = async (
  config: PostizConfig,
  platform: string,
  content: string,
  scheduledDate?: string
): Promise<Result<PostizPost>> => {
  try {
    // Get available integrations
    const integrationsResult = await getIntegrations(config);
    if (!integrationsResult.success) {
      return integrationsResult;
    }
    
    
    // Find the integration for the specified platform
    const integration = findIntegrationByProvider(integrationsResult.data, platform);
    if (!integration) {
      return {
        success: false,
        error: new Error(`No ${platform} integration found in Postiz. Available: ${integrationsResult.data.map(i => i.identifier).join(', ')}`)
      };
    }
    
    // Create the post request using the SDK format
    const postRequest = createPostRequest(integration.id, content, scheduledDate);
    
    // Create the post using SDK
    const createResult = await createPost(config, postRequest);
    if (!createResult.success) {
      return createResult;
    }
    
    return {
      success: true,
      data: createResult.data
    };
  } catch (error) {
    console.error(`❌ Error scheduling post:`, error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};