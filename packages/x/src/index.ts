/**
 * @content-creation/x
 * 
 * Direct X/Twitter API integration for content creation platform
 * Provides functional interfaces for X posting, scheduling, and analytics
 */

// Main client functions
export {
  createXClient,
  getProfile,
  createTweet,
  createThread,
  deleteTweet,
  getTweets,
  schedulePostToPlatform,
  createPostOrThread
} from './x-client';

// Authentication utilities
export {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  validateAccessToken,
  generateAppOnlyToken,
  XClient
} from './auth';

// Direct API functions (if you need lower-level access)
export {
  createTweet as createTweetAPI,
  deleteTweet as deleteTweetAPI,
  getTweets as getTweetsAPI,
  getProfile as getProfileAPI,
  createThread as createThreadAPI,
  getTweetAnalytics
} from './tweets';

// Re-export types from shared package for convenience
export type {
  XConfig,
  XProfile,
  XTweet,
  XTweetData,
  XAnalytics,
  XMediaUpload,
  ScheduledPost
} from '@content-creation/shared';