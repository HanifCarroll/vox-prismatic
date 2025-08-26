/**
 * Shared types for social media integrations
 * Defines common interfaces for LinkedIn, X, and other platforms
 */

// Import common types from shared package
import type { Result, Platform } from '@content-creation/types';

// Re-export basic types
export type { Result, Platform } from '@content-creation/types';

// Platform configuration interfaces
export interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
}

export interface XConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  bearerToken?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

// Platform identifiers - using type from shared package

// Profile interfaces
export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    displayImage: string;
  };
  vanityName?: string;
}

export interface XProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

// Post/Tweet data interfaces
export interface LinkedInPostData {
  content: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
}

export interface XTweetData {
  text: string;
  replyTo?: string;
  quoteTweetId?: string;
  mediaIds?: string[];
  poll?: {
    options: string[];
    duration_minutes: number;
  };
}

// Response interfaces
export interface LinkedInPost {
  id: string;
  content: string;
  createdAt: string;
  visibility: string;
  author: string;
  shareUrl?: string;
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface XTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  referenced_tweets?: Array<{
    type: 'replied_to' | 'quoted' | 'retweeted';
    id: string;
  }>;
}

// Analytics interfaces
export interface LinkedInAnalytics {
  postId: string;
  impressions: number;
  clicks: number;
  reactions: number;
  comments: number;
  shares: number;
  follows: number;
}

export interface XAnalytics {
  tweetId: string;
  impressions: number;
  url_link_clicks: number;
  user_profile_clicks: number;
  likes: number;
  replies: number;
  retweets: number;
}

// Media upload interfaces
export interface XMediaUpload {
  media_id: string;
  media_id_string: string;
  media_key?: string;
  size: number;
  expires_after_secs?: number;
}

// Scheduled post interface (for integration with database)
export interface ScheduledPost {
  id: string;
  platform: Platform;
  content: string;
  scheduledTime: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  externalPostId?: string;
  errorMessage?: string;
  retryCount: number;
}

// Social media client interfaces
export interface SocialMediaClient {
  platform: Platform;
  isAuthenticated: boolean;
  post(content: string, options?: Record<string, any>): Promise<Result<any>>;
  getProfile(): Promise<Result<any>>;
  deletePost(postId: string): Promise<Result<void>>;
}

// Authentication token interfaces
export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface XTokenResponse {
  token_type: string;
  expires_in?: number;
  access_token: string;
  scope?: string;
  refresh_token?: string;
}

// OAuth state management
export interface OAuthState {
  platform: Platform;
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
}