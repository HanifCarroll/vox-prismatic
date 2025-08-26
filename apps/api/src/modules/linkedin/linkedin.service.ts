import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LinkedInConfig,
  LinkedInTokenResponse,
  LinkedInProfile,
  LinkedInPost,
  LinkedInPostData,
  LinkedInAnalytics,
  Result,
  SocialMediaClient,
} from '../integrations/types/social-media.types';

/**
 * LinkedIn integration service for NestJS
 * Handles OAuth authentication and LinkedIn API operations
 */
@Injectable()
export class LinkedInService implements SocialMediaClient {
  private readonly logger = new Logger(LinkedInService.name);
  public readonly platform = 'linkedin' as const;
  private config: LinkedInConfig;
  private _accessToken?: string;

  constructor(private configService: ConfigService) {
    this.config = {
      clientId: this.configService.get<string>('LINKEDIN_CLIENT_ID') || '',
      clientSecret: this.configService.get<string>('LINKEDIN_CLIENT_SECRET') || '',
      redirectUri: this.configService.get<string>('LINKEDIN_REDIRECT_URI') || '',
      accessToken: this.configService.get<string>('LINKEDIN_ACCESS_TOKEN'),
    };
    this._accessToken = this.config.accessToken;
  }

  get isAuthenticated(): boolean {
    return !!this._accessToken;
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this._accessToken = token;
  }

  /**
   * Generate LinkedIn OAuth 2.0 authorization URL
   */
  generateAuthUrl(state: string = ''): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: 'w_member_social profile openid email', // Required scopes for posting
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<Result<LinkedInTokenResponse>> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      });

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        return {
          success: false,
          error: new Error(`LinkedIn OAuth error: ${errorData?.error_description || response.statusText}`),
        };
      }

      const tokenData = (await response.json()) as LinkedInTokenResponse;

      // Store the access token
      this._accessToken = tokenData.access_token;

      return {
        success: true,
        data: tokenData,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for token', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<Result<LinkedInTokenResponse>> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        return {
          success: false,
          error: new Error(`LinkedIn refresh token error: ${errorData?.error_description || response.statusText}`),
        };
      }

      const tokenData = (await response.json()) as LinkedInTokenResponse;

      // Update the access token
      this._accessToken = tokenData.access_token;

      return {
        success: true,
        data: tokenData,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Validate access token by making a test API call
   */
  async validateAccessToken(): Promise<Result<boolean>> {
    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('No access token available'),
      };
    }

    try {
      const response = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        return {
          success: false,
          error: new Error('LinkedIn access token is invalid or expired'),
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: new Error(`LinkedIn API error: ${response.statusText}`),
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      this.logger.error('Failed to validate access token', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get authenticated user's LinkedIn profile
   */
  async getProfile(): Promise<Result<LinkedInProfile>> {
    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('Not authenticated with LinkedIn'),
      };
    }

    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams),vanityName)',
        {
          headers: {
            'Authorization': `Bearer ${this._accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        return {
          success: false,
          error: new Error(`LinkedIn API error: ${errorData?.message || response.statusText}`),
        };
      }

      const profileData = await response.json() as any;

      const profile: LinkedInProfile = {
        id: profileData?.id || '',
        localizedFirstName: profileData?.localizedFirstName || '',
        localizedLastName: profileData?.localizedLastName || '',
        profilePicture: profileData?.profilePicture
          ? {
              displayImage:
                profileData?.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier || '',
            }
          : undefined,
        vanityName: profileData?.vanityName || '',
      };

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      this.logger.error('Failed to get profile', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a LinkedIn post
   */
  async createPost(postData: LinkedInPostData): Promise<Result<LinkedInPost>> {
    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('Not authenticated with LinkedIn'),
      };
    }

    try {
      this.logger.log('📝 Creating LinkedIn post...');

      // First, get the person's URN for posting
      const profileResult = await this.getProfile();
      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error,
        } as Result<LinkedInPost>;
      }

      const authorUrn = `urn:li:person:${profileResult.data.id}`;

      // Prepare the post payload
      const postPayload = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: postData.content,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': postData.visibility || 'PUBLIC',
        },
      };

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: new Error(`LinkedIn post creation error: ${errorData.message || response.statusText}`),
        };
      }

      const postResponse = await response.json();
      const postId = postResponse.id;

      // Get the created post details
      const postDetailsResponse = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      let post: LinkedInPost;

      if (!postDetailsResponse.ok) {
        // Post was created but we couldn't fetch details
        post = {
          id: postId,
          content: postData.content,
          createdAt: new Date().toISOString(),
          visibility: postData.visibility || 'PUBLIC',
          author: authorUrn,
        };
      } else {
        const postDetails = await postDetailsResponse.json();
        post = {
          id: postDetails.id,
          content: postData.content,
          createdAt: postDetails.created?.time
            ? new Date(postDetails.created.time).toISOString()
            : new Date().toISOString(),
          visibility: postData.visibility || 'PUBLIC',
          author: postDetails.author,
          shareUrl: `https://www.linkedin.com/posts/${profileResult.data.id}_${postId}`,
        };
      }

      this.logger.log('✅ LinkedIn post created successfully');
      return {
        success: true,
        data: post,
      };
    } catch (error) {
      this.logger.error('Failed to create post', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Simplified post method for SocialMediaClient interface
   */
  async post(
    content: string,
    options?: { visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS' }
  ): Promise<Result<LinkedInPost>> {
    const postData: LinkedInPostData = {
      content,
      visibility: options?.visibility,
    };
    return this.createPost(postData);
  }

  /**
   * Delete a LinkedIn post
   */
  async deletePost(postId: string): Promise<Result<void>> {
    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('Not authenticated with LinkedIn'),
      };
    }

    try {
      const response = await fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: new Error(`LinkedIn post deletion error: ${errorData.message || response.statusText}`),
        };
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      this.logger.error('Failed to delete post', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get user's LinkedIn posts
   */
  async getPosts(limit: number = 20): Promise<Result<LinkedInPost[]>> {
    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('Not authenticated with LinkedIn'),
      };
    }

    try {
      this.logger.log(`📡 Fetching LinkedIn posts (limit: ${limit})...`);

      // First, get the person's URN
      const profileResult = await this.getProfile();
      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error,
        } as Result<LinkedInPost[]>;
      }

      const authorUrn = `urn:li:person:${profileResult.data.id}`;

      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(
          authorUrn
        )})&count=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this._accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        return {
          success: false,
          error: new Error(`LinkedIn API error: ${errorData?.message || response.statusText}`),
        };
      }

      const postsData = await response.json();
      const posts: LinkedInPost[] = postsData.elements?.map((post: any) => ({
        id: post.id,
        content:
          post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
        createdAt: post.created?.time
          ? new Date(post.created.time).toISOString()
          : new Date().toISOString(),
        visibility:
          post.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'] || 'PUBLIC',
        author: post.author,
        shareUrl: `https://www.linkedin.com/posts/${profileResult.data.id}_${post.id}`,
      })) || [];

      this.logger.log(`✅ Found ${posts.length} LinkedIn posts`);
      return {
        success: true,
        data: posts,
      };
    } catch (error) {
      this.logger.error('Failed to get posts', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get post analytics
   */
  async getPostAnalytics(postId: string): Promise<Result<LinkedInAnalytics>> {
    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('Not authenticated with LinkedIn'),
      };
    }

    try {
      // Note: LinkedIn analytics API requires additional permissions
      // and may not be available for all accounts
      const response = await fetch(
        `https://api.linkedin.com/v2/socialActions/${postId}/statistics`,
        {
          headers: {
            'Authorization': `Bearer ${this._accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: new Error(
            `LinkedIn analytics error: ${errorData.message || response.statusText}`
          ),
        };
      }

      const analyticsData = await response.json();

      const analytics: LinkedInAnalytics = {
        postId,
        impressions: analyticsData.impressionCount || 0,
        clicks: analyticsData.clickCount || 0,
        reactions: analyticsData.likeCount || 0,
        comments: analyticsData.commentCount || 0,
        shares: analyticsData.shareCount || 0,
        follows: analyticsData.followCount || 0,
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      this.logger.error('Failed to get post analytics', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a LinkedIn client instance (for backward compatibility)
   */
  createLinkedInClient(config?: LinkedInConfig): Result<LinkedInService> {
    if (config) {
      this.config = config;
      this._accessToken = config.accessToken;
    }

    if (!this._accessToken) {
      return {
        success: false,
        error: new Error('LinkedIn access token is required'),
      };
    }

    return {
      success: true,
      data: this,
    };
  }
}