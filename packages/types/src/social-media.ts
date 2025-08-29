/**
 * Social Media Integration Types
 * Centralized types for LinkedIn, X (Twitter), and other social media platform integrations
 */

import type { Platform, Result } from './common';

// =====================================================================
// PLATFORM CONFIGURATION INTERFACES
// =====================================================================

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

// =====================================================================
// PROFILE INTERFACES
// =====================================================================

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

// =====================================================================
// POST/TWEET DATA INTERFACES
// =====================================================================

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

// =====================================================================
// RESPONSE INTERFACES
// =====================================================================

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

// =====================================================================
// ANALYTICS INTERFACES
// =====================================================================

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

// =====================================================================
// MEDIA UPLOAD INTERFACES
// =====================================================================

export interface XMediaUpload {
  media_id: string;
  media_id_string: string;
  media_key?: string;
  size: number;
  expires_after_secs?: number;
}

// =====================================================================
// SOCIAL MEDIA CLIENT INTERFACES
// =====================================================================

export interface SocialMediaClient {
  platform: Platform;
  isAuthenticated: boolean;
  post(content: string, options?: Record<string, any>): Promise<Result<any>>;
  getProfile(): Promise<Result<any>>;
  deletePost(postId: string): Promise<Result<void>>;
}

// =====================================================================
// AUTHENTICATION TOKEN INTERFACES
// =====================================================================

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

// =====================================================================
// OAUTH STATE MANAGEMENT
// =====================================================================

export interface OAuthState {
  platform: Platform;
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
}

// =====================================================================
// INTEGRATION SCHEDULED POST INTERFACE
// =====================================================================
// Simplified view of ScheduledPost for social media integration contexts

import type { ScheduledPostView, ScheduledPostStatus } from './common';

// Helper type that extracts social media relevant fields from ScheduledPostView
export type SocialMediaScheduledPost = Pick<
  ScheduledPostView, 
  'id' | 'platform' | 'content' | 'scheduledTime' | 'status' | 'externalPostId' | 'errorMessage' | 'retryCount'
>;