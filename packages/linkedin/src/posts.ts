import { 
  LinkedInPost, 
  LinkedInPostData, 
  LinkedInProfile, 
  LinkedInAnalytics,
  Result 
} from '@content-creation/shared';
import { LinkedInClient } from './auth';

/**
 * LinkedIn Posts API implementation
 * Based on LinkedIn API v2 documentation
 */

/**
 * Get authenticated user's profile
 */
export const getProfile = async (client: LinkedInClient): Promise<Result<LinkedInProfile>> => {
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/(id~)', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'LinkedIn-Version': '202212'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`LinkedIn API error: ${response.status} ${errorData}`)
      };
    }

    const profileData = await response.json();
    
    const profile: LinkedInProfile = {
      id: profileData.id,
      firstName: profileData.firstName?.localized?.en_US || '',
      lastName: profileData.lastName?.localized?.en_US || '',
      profilePicture: profileData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
      vanityName: profileData.vanityName
    };

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Create a LinkedIn post
 */
export const createPost = async (
  client: LinkedInClient,
  postData: LinkedInPostData
): Promise<Result<LinkedInPost>> => {
  try {
    // Get user profile to get author URN
    const profileResult = await getProfile(client);
    if (!profileResult.success) {
      return profileResult;
    }

    const authorUrn = postData.author || `urn:li:person:${profileResult.data.id}`;

    // Create post request body according to LinkedIn Posts API v2
    const requestBody = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postData.content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': postData.visibility
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202212',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`LinkedIn post creation failed: ${response.status} ${errorData}`)
      };
    }

    const responseData = await response.json();
    
    // Transform response to our LinkedInPost interface
    const post: LinkedInPost = {
      id: responseData.id,
      content: postData.content,
      publishedAt: new Date().toISOString(),
      visibility: postData.visibility,
      author: authorUrn
    };

    return {
      success: true,
      data: post
    };
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
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'LinkedIn-Version': '202212'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`LinkedIn post deletion failed: ${response.status} ${errorData}`)
      };
    }

    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get user's posts (limited by LinkedIn API permissions)
 */
export const getPosts = async (
  client: LinkedInClient,
  limit: number = 20
): Promise<Result<LinkedInPost[]>> => {
  try {
    // Get user profile first
    const profileResult = await getProfile(client);
    if (!profileResult.success) {
      return profileResult;
    }

    const authorUrn = `urn:li:person:${profileResult.data.id}`;
    
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=${encodeURIComponent(authorUrn)}&count=${limit}`, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'LinkedIn-Version': '202212'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: new Error(`LinkedIn posts fetch failed: ${response.status} ${errorData}`)
      };
    }

    const responseData = await response.json();
    const posts: LinkedInPost[] = responseData.elements?.map((element: any) => ({
      id: element.id,
      content: element.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
      publishedAt: new Date(element.created?.time || 0).toISOString(),
      visibility: element.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'] || 'UNKNOWN',
      author: element.author
    })) || [];

    return {
      success: true,
      data: posts
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Get post analytics (requires additional API permissions)
 * Note: This is a basic implementation - full analytics require LinkedIn Marketing API
 */
export const getPostAnalytics = async (
  client: LinkedInClient,
  postId: string
): Promise<Result<LinkedInAnalytics>> => {
  try {
    // LinkedIn Analytics API requires special permissions
    // This is a placeholder implementation
    const analytics: LinkedInAnalytics = {
      postId,
      impressions: 0,
      clicks: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      engagementRate: 0
    };

    return {
      success: true,
      data: analytics
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};