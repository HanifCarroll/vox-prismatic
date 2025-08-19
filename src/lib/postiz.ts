import { PostizConfig, PostizIntegration, PostizPost, PostizCreatePostRequest, PostizListResponse, Result } from './types.ts';

/**
 * Functional Postiz API operations
 */

/**
 * Creates HTTP headers for Postiz API requests
 */
const createHeaders = (apiKey: string): HeadersInit => ({
  'Authorization': apiKey,
  'Content-Type': 'application/json'
});

/**
 * Makes HTTP request to Postiz API with error handling
 */
const makeRequest = async <T>(
  url: string,
  options: RequestInit
): Promise<Result<T>> => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: new Error(`Postiz API error (${response.status}): ${errorText}`)
      };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error as Error
    };
  }
};

/**
 * Gets all connected integrations (channels) from Postiz
 */
export const getIntegrations = async (config: PostizConfig): Promise<Result<PostizIntegration[]>> => {
  const url = `${config.baseUrl}/integrations`;
  const options = {
    method: 'GET',
    headers: createHeaders(config.apiKey)
  };
  
  return await makeRequest<PostizIntegration[]>(url, options);
};

/**
 * Gets scheduled and published posts from Postiz
 */
export const getPosts = async (config: PostizConfig): Promise<Result<PostizListResponse>> => {
  const url = `${config.baseUrl}/posts`;
  const options = {
    method: 'GET',
    headers: createHeaders(config.apiKey)
  };
  
  return await makeRequest<PostizListResponse>(url, options);
};

/**
 * Creates a new post in Postiz (draft, schedule, or publish now)
 */
export const createPost = async (
  config: PostizConfig,
  request: PostizCreatePostRequest
): Promise<Result<PostizListResponse>> => {
  const url = `${config.baseUrl}/posts`;
  const options = {
    method: 'POST',
    headers: createHeaders(config.apiKey),
    body: JSON.stringify(request)
  };
  
  return await makeRequest<PostizListResponse>(url, options);
};

/**
 * Deletes a post from Postiz
 */
export const deletePost = async (
  config: PostizConfig,
  postId: string
): Promise<Result<void>> => {
  const url = `${config.baseUrl}/posts/${postId}`;
  const options = {
    method: 'DELETE',
    headers: createHeaders(config.apiKey)
  };
  
  return await makeRequest<void>(url, options);
};

/**
 * Helper function to find integration by provider (linkedin, x, etc.)
 */
export const findIntegrationByProvider = (
  integrations: PostizIntegration[],
  provider: string
): PostizIntegration | null => {
  return integrations.find(integration => 
    integration.providerIdentifier.toLowerCase() === provider.toLowerCase()
  ) || null;
};

/**
 * Helper function to create a post request for a specific platform
 */
export const createPostRequest = (
  integrationId: string,
  content: string,
  type: 'draft' | 'schedule' | 'now' = 'now',
  scheduledDate?: string
): PostizCreatePostRequest => {
  const request: PostizCreatePostRequest = {
    type,
    posts: [
      {
        integration: { id: integrationId },
        value: [
          {
            content: content.trim()
          }
        ]
      }
    ]
  };
  
  if (type === 'schedule' && scheduledDate) {
    request.date = scheduledDate;
  }
  
  return request;
};

/**
 * Schedules a post to a specific platform through Postiz
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
        error: new Error(`No ${platform} integration found in Postiz`)
      };
    }
    
    // Create the post request
    const postRequest = createPostRequest(
      integration.id,
      content,
      scheduledDate ? 'schedule' : 'now',
      scheduledDate
    );
    
    // Create the post
    const createResult = await createPost(config, postRequest);
    if (!createResult.success) {
      return createResult;
    }
    
    // Return the first post from the response
    const posts = createResult.data.posts;
    if (posts.length === 0) {
      return {
        success: false,
        error: new Error('No post was created')
      };
    }
    
    return {
      success: true,
      data: posts[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error
    };
  }
};