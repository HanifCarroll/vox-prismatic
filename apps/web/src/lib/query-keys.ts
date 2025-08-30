/**
 * Centralized React Query keys for consistent cache management
 * Follows a hierarchical pattern for easy invalidation
 */

import type { 
  TranscriptFilter, 
  InsightFilter, 
  PostFilter 
} from '@content-creation/types';

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    data: () => ['dashboard', 'data'] as const,
  },

  // Transcripts
  transcripts: {
    all: ['transcripts'] as const,
    lists: () => ['transcripts', 'list'] as const,
    list: (filters?: TranscriptFilter) => ['transcripts', 'list', filters] as const,
    details: () => ['transcripts', 'details'] as const,
    detail: (id: string) => ['transcripts', 'details', id] as const,
    count: (filters?: TranscriptFilter) => ['transcripts', 'count', filters] as const,
  },

  // Insights
  insights: {
    all: ['insights'] as const,
    lists: () => ['insights', 'list'] as const,
    list: (filters?: InsightFilter) => ['insights', 'list', filters] as const,
    details: () => ['insights', 'details'] as const,
    detail: (id: string) => ['insights', 'details', id] as const,
    count: (filters?: InsightFilter) => ['insights', 'count', filters] as const,
    byTranscript: (transcriptId: string) => ['insights', 'byTranscript', transcriptId] as const,
  },

  // Posts
  posts: {
    all: ['posts'] as const,
    lists: () => ['posts', 'list'] as const,
    list: (filters?: PostFilter) => ['posts', 'list', filters] as const,
    details: () => ['posts', 'details'] as const,
    detail: (id: string) => ['posts', 'details', id] as const,
    count: (filters?: PostFilter) => ['posts', 'count', filters] as const,
    byInsight: (insightId: string) => ['posts', 'byInsight', insightId] as const,
    scheduled: () => ['posts', 'scheduled'] as const,
  },

  // Scheduled Events
  scheduledEvents: {
    all: ['scheduledEvents'] as const,
    lists: () => ['scheduledEvents', 'list'] as const,
    list: (filters?: any) => ['scheduledEvents', 'list', filters] as const,
    upcoming: () => ['scheduledEvents', 'upcoming'] as const,
    byPost: (postId: string) => ['scheduledEvents', 'byPost', postId] as const,
  },

  // Workflow
  workflow: {
    all: ['workflow'] as const,
    status: () => ['workflow', 'status'] as const,
    pipeline: () => ['workflow', 'pipeline'] as const,
    jobs: () => ['workflow', 'jobs'] as const,
    job: (id: string) => ['workflow', 'job', id] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    events: () => ['analytics', 'events'] as const,
    stats: () => ['analytics', 'stats'] as const,
    performance: () => ['analytics', 'performance'] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    list: () => ['settings', 'list'] as const,
    byKey: (key: string) => ['settings', key] as const,
  },
} as const;

/**
 * Helper function to invalidate all queries under a specific namespace
 */
export function getInvalidateKeys(namespace: keyof typeof queryKeys) {
  return queryKeys[namespace].all;
}