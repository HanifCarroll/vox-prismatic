'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { workflowApi } from '@/lib/workflow-api';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  CACHE_TAGS,
  ValidationError
} from '../lib/action-utils';

/**
 * Transcript Processing Operations
 * Server actions for transcript processing operations like cleaning and insight generation
 */

/**
 * Clean transcript content using workflow API
 */
export const cleanTranscript = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  const response = await workflowApi.transcripts.clean(id);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to start transcript cleaning');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.detail(id));
  revalidateTag(CACHE_TAGS.transcripts.byStatus('processing'));
  revalidatePath('/content');

  return createResponse({ 
    id, 
    jobId: response.data?.jobId,
    message: 'Transcript cleaning started',
    type: 'workflow_job'
  });
});

/**
 * Generate insights from transcript using workflow API
 */
export const generateInsightsFromTranscript = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  const response = await workflowApi.transcripts.generateInsights(id);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to start insight generation');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.detail(id));
  revalidateTag(CACHE_TAGS.insights.all);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath('/content');

  return createResponse({ 
    id, 
    jobId: response.data?.jobId,
    message: 'Insight generation started',
    type: 'workflow_job'
  });
});