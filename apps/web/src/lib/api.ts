/**
 * Central API Client
 * Exports all API modules for easy importing throughout the app
 */

// Re-export all API modules
export { insightsAPI } from './api/insights';
export { postsAPI } from './api/posts';
export { transcriptsAPI } from './api/transcripts';
export { dashboardAPI } from './api/dashboard';
export { schedulerAPI } from './api/scheduler';
export { promptsAPI } from './api/prompts';

// Re-export the workflow API (already exists)
export { workflowApi } from './workflow-api';

// Re-export types that API consumers might need
export type { JobStatus, PipelineProgress, WorkflowStats } from './workflow-api';

// Import all APIs for namespace export
import { insightsAPI } from './api/insights';
import { postsAPI } from './api/posts';
import { transcriptsAPI } from './api/transcripts';
import { dashboardAPI } from './api/dashboard';
import { schedulerAPI } from './api/scheduler';
import { promptsAPI } from './api/prompts';
import { workflowApi } from './workflow-api';

// Convenience namespace export for cleaner imports
export const api = {
  insights: insightsAPI,
  posts: postsAPI,
  transcripts: transcriptsAPI,
  dashboard: dashboardAPI,
  scheduler: schedulerAPI,
  prompts: promptsAPI,
  workflow: workflowApi,
} as const;