import { 
  LinkedInProfile, 
  LinkedInPost, 
  LinkedInPostData,
  LinkedInAnalytics,
  Result 
} from '../types/social-media';
import { LinkedInClient } from './auth';

/**
 * LinkedIn API functions for posts and profile management
 */

/**
 * Get authenticated user's LinkedIn profile
 */
export const getProfile = async (client: LinkedInClient): Promise<Result<LinkedInProfile>> => {
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams),vanityName)', {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`LinkedIn API error: ${errorData.message || response.statusText}`)
      };
    }

    const profileData = await response.json();

    const profile: LinkedInProfile = {
      id: profileData.id,
      localizedFirstName: profileData.localizedFirstName,
      localizedLastName: profileData.localizedLastName,
      profilePicture: profileData.profilePicture ? {
        displayImage: profileData.profilePicture.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier || ''
      } : undefined,
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
    // First, get the person's URN for posting
    const profileResult = await getProfile(client);
    if (!profileResult.success) {
      return profileResult;
    }

    const authorUrn = `urn:li:person:${profileResult.data.id}`;

    // Prepare the post payload
    const postPayload = {
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
        'com.linkedin.ugc.MemberNetworkVisibility': postData.visibility || 'PUBLIC'
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`LinkedIn post creation error: ${errorData.message || response.statusText}`)
      };
    }

    const postResponse = await response.json();
    const postId = postResponse.id;

    // Get the created post details
    const postDetailsResponse = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!postDetailsResponse.ok) {
      // Post was created but we couldn't fetch details
      const post: LinkedInPost = {
        id: postId,
        content: postData.content,
        createdAt: new Date().toISOString(),
        visibility: postData.visibility || 'PUBLIC',
        author: authorUrn
      };

      return {
        success: true,
        data: post
      };
    }

    const postDetails = await postDetailsResponse.json();

    const post: LinkedInPost = {
      id: postDetails.id,
      content: postData.content,
      createdAt: postDetails.created?.time ? new Date(postDetails.created.time).toISOString() : new Date().toISOString(),
      visibility: postData.visibility || 'PUBLIC',
      author: postDetails.author,
      shareUrl: `https://www.linkedin.com/posts/${profileResult.data.id}_${postId}`
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
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`LinkedIn post deletion error: ${errorData.message || response.statusText}`)
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
 * Get user's LinkedIn posts
 */
export const getPosts = async (
  client: LinkedInClient,
  limit: number = 20
): Promise<Result<LinkedInPost[]>> => {
  try {
    // Get user profile to get their URN
    const profileResult = await getProfile(client);
    if (!profileResult.success) {
      return profileResult;
    }

    const authorUrn = `urn:li:person:${profileResult.data.id}`;

    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=${encodeURIComponent(authorUrn)}&count=${limit}&sortBy=CREATED`, {
      headers: {
        'Authorization': `Bearer ${client.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: new Error(`LinkedIn posts fetch error: ${errorData.message || response.statusText}`)
      };
    }

    const postsData = await response.json();
    const posts: LinkedInPost[] = [];

    if (postsData.elements) {
      for (const postElement of postsData.elements) {
        const post: LinkedInPost = {
          id: postElement.id,
          content: postElement.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
          createdAt: postElement.created?.time ? new Date(postElement.created.time).toISOString() : new Date().toISOString(),
          visibility: postElement.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'] || 'PUBLIC',
          author: postElement.author
        };
        posts.push(post);
      }
    }

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
 * Get post analytics (if available)
 */
export const getPostAnalytics = async (
  client: LinkedInClient,
  postId: string
): Promise<Result<LinkedInAnalytics>> => {
  try {
    // LinkedIn analytics require additional permissions and are limited
    // For now, return basic structure with zeros
    const analytics: LinkedInAnalytics = {
      postId,
      impressions: 0,
      clicks: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      follows: 0
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