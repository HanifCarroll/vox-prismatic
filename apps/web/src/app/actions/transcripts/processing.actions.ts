'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
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
 * Clean transcript content
 */
export const cleanTranscript = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  const response = await apiClient.post(`/api/transcripts/${id}/clean`, {});
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to clean transcript');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.detail(id));
  revalidateTag(CACHE_TAGS.transcripts.byStatus('cleaning'));
  revalidatePath('/content');

  return createResponse({ 
    id, 
    message: 'Transcript cleaning started' 
  });
});

/**
 * Generate insights from transcript
 */
export const generateInsightsFromTranscript = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  const response = await apiClient.post(`/api/transcripts/${id}/generate-insights`, {});
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to generate insights');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.detail(id));
  revalidateTag(CACHE_TAGS.insights.all);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidatePath('/content');

  return createResponse({ 
    id, 
    message: 'Insight generation started',
    insightIds: response.data?.insightIds || []
  });
});