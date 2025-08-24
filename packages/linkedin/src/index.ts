/**
 * @content-creation/linkedin
 * 
 * Direct LinkedIn API integration for content creation platform
 * Provides functional interfaces for LinkedIn posting, scheduling, and analytics
 */

// Main client functions
export {
  createLinkedInClient,
  getProfile,
  createPost,
  deletePost,
  getPosts,
  schedulePostToPlatform
} from './linkedin-client';

// Authentication utilities
export {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  validateAccessToken,
  LinkedInClient
} from './auth';

// Direct API functions (if you need lower-level access)
export {
  createPost as createPostAPI,
  deletePost as deletePostAPI,
  getPosts as getPostsAPI,
  getProfile as getProfileAPI,
  getPostAnalytics
} from './posts';

// Re-export types from shared package for convenience
export type {
  LinkedInConfig,
  LinkedInProfile,
  LinkedInPost,
  LinkedInPostData,
  LinkedInAnalytics,
  ScheduledPost
} from '@content-creation/shared';