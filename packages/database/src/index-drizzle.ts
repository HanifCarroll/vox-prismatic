/**
 * @content-creation/database
 * 
 * Drizzle-based SQLite database layer for the entire content creation pipeline
 */

// Database connection and management
export {
  initDatabase,
  getDatabase,
  getSQLiteConnection,
  closeDatabase,
  withTransaction,
  runMigrations
} from './connection-drizzle';

// Content repository (replaces unified-content with Drizzle)
export {
  getContent,
  getContentStats,
  createContent,
  updateContentStatus,
  getContentById,
  deleteContent,
  getContentPipeline,
  type ContentFilter,
  type ContentStats
} from './content-repository';

// Schema and types
export {
  content,
  contentRelationships,
  processingJobs,
  analyticsEvents,
  settings,
  schemaInfo,
  type Content,
  type NewContent,
  type ContentType,
  type ContentStatus,
  type Platform,
  type SourceType
} from './schema';

// Re-export shared types for convenience
export type {
  Result,
  PostType
} from '@content-creation/shared';

// Legacy compatibility aliases (during migration period)
export const getUnifiedContent = getContent;
export const getUnifiedContentStats = getContentStats;
export const createUnifiedContent = createContent;
export const updateUnifiedContentStatus = updateContentStatus;
export type UnifiedContent = Content;