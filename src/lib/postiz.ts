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
  
  console.log(`🔗 Creating Postiz client:`);
  console.log(`   - Config base URL: ${baseUrl}`);
  console.log(`   - API key: ${config.apiKey.substring(0, 20)}...`);
  
  // The test showed that the URL with /api/ works
  return new Postiz(config.apiKey, baseUrl);
};

/**
 * Gets all connected integrations (channels) from Postiz
 */
export const getIntegrations = async (config: PostizConfig): Promise<Result<PostizIntegration[]>> => {
  try {
    console.log(`📡 Fetching integrations from Postiz...`);
    const client = createPostizClient(config);
    
    console.log(`🔍 About to call client.integrations()...`);
    
    // Let's also try to catch and inspect what the SDK is actually trying to fetch
    const integrations = await client.integrations();
    
    console.log(`✅ Raw integrations response:`, JSON.stringify(integrations, null, 2));
    console.log(`✅ Found ${integrations?.length || 0} integrations`);
    
    return { success: true, data: integrations || [] };
  } catch (error) {
    console.error(`❌ Failed to get integrations:`, error);
    console.error(`❌ Error type:`, error.constructor.name);
    console.error(`❌ Error message:`, error.message);
    
    // More detailed error inspection
    if (error.cause) {
      console.error(`❌ Error cause:`, error.cause);
    }
    
    // Check if it's a fetch error or response error
    if (error.message?.includes('Failed to parse JSON')) {
      console.error(`❌ This appears to be a JSON parsing error from the SDK`);
      console.error(`❌ The API is likely returning HTML instead of JSON`);
      console.error(`❌ Possible causes:`);
      console.error(`   1. API key is invalid or expired`);
      console.error(`   2. Wrong API endpoint URL`);
      console.error(`   3. Authentication headers not properly set by SDK`);
      console.error(`❌ Please check your Postiz dashboard to verify:`);
      console.error(`   - API key is correct and active`);
      console.error(`   - Your self-hosted instance is properly configured`);
      console.error(`   - The /public/v1 endpoint is accessible`);
    }
    
    if (error.stack) {
      console.error(`❌ Stack trace:`, error.stack);
    }
    
    return {
      success: false,
      error: error as Error
    };
  }
};

/**
 * Gets scheduled and published posts from Postiz
 */
export const getPosts = async (config: PostizConfig): Promise<Result<any>> => {
  try {
    console.log(`📡 Fetching posts from Postiz...`);
    const client = createPostizClient(config);
    
    const posts = await client.postList({});
    console.log(`✅ Found ${posts.length} posts`);
    
    return { success: true, data: posts };
  } catch (error) {
    console.error(`❌ Failed to get posts:`, error);
    return {
      success: false,
      error: error as Error
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
    console.log(`📤 Creating post with SDK:`, JSON.stringify(postData, null, 2));
    const client = createPostizClient(config);
    
    const result = await client.post(postData);
    console.log(`✅ Post created successfully:`, result);
    
    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ Failed to create post:`, error);
    return {
      success: false,
      error: error as Error
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
  
  // The actual API returns 'identifier' not 'providerIdentifier'
  return integrations.find(integration => 
    integration.identifier?.toLowerCase() === targetProvider
  ) || null;
};

/**
 * Helper function to create a post request for the SDK
 */
export const createPostRequest = (
  integrationId: string,
  content: string,
  scheduledDate?: string
) => {
  const postData = {
    posts: [
      {
        integration: integrationId,
        content: content.trim()
      }
    ]
  };
  
  // Add scheduling date if provided
  if (scheduledDate) {
    // Convert ISO string to the format Postiz expects
    const scheduleDate = new Date(scheduledDate);
    return {
      ...postData,
      date: scheduleDate.toISOString(),
      schedule: true
    };
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
    console.log(`📅 Scheduling ${platform} post${scheduledDate ? ' for ' + new Date(scheduledDate).toLocaleString() : ' now'}`);
    
    // Get available integrations
    const integrationsResult = await getIntegrations(config);
    if (!integrationsResult.success) {
      return integrationsResult;
    }
    
    // Find the integration for the specified platform
    const integration = findIntegrationByProvider(integrationsResult.data, platform);
    if (!integration) {
      console.error(`❌ Available integrations:`, integrationsResult.data.map(i => ({
        id: i.id,
        name: i.name,
        provider: i.providerIdentifier
      })));
      return {
        success: false,
        error: new Error(`No ${platform} integration found in Postiz. Available: ${integrationsResult.data.map(i => i.providerIdentifier).join(', ')}`)
      };
    }
    
    console.log(`✅ Found integration: ${integration.name} (${integration.providerIdentifier})`);
    
    // Create the post request using the SDK format
    const postRequest = createPostRequest(integration.id, content, scheduledDate);
    
    // Create the post using SDK
    const createResult = await createPost(config, postRequest);
    if (!createResult.success) {
      return createResult;
    }
    
    // Return the result - SDK might return different format
    return {
      success: true,
      data: createResult.data
    };
  } catch (error) {
    console.error(`❌ Error in schedulePostToPlatform:`, error);
    return {
      success: false,
      error: error as Error
    };
  }
};