/**
 * @deprecated - All social media integration types have been moved to @content-creation/types
 * This file now re-exports from the centralized location for backwards compatibility.
 * Import directly from '@content-creation/types' in new code.
 */

// Re-export all social media integration types from centralized location
export {
  LinkedInConfig,
  XConfig,
  LinkedInProfile,
  XProfile,
  LinkedInPostData,
  XTweetData,
  LinkedInPost,
  XTweet,
  LinkedInAnalytics,
  XAnalytics,
  XMediaUpload,
  SocialMediaClient,
  LinkedInTokenResponse,
  XTokenResponse,
  OAuthState,
  SocialMediaScheduledPost as ScheduledPost, // Backwards compatibility alias
} from '@content-creation/types';