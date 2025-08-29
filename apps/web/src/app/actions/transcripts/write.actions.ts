'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { TranscriptView } from '@/types/database';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  CACHE_TAGS,
  sanitizeInput,
  ValidationError,
  parseFormData
} from '../lib/action-utils';

/**
 * Transcript Write Operations
 * Server actions for creating, updating, and deleting transcripts
 */

/**
 * Create new transcript
 */
export const createTranscript = withErrorHandling(async (formData: FormData) => {
  await verifyAuth();

  const data = parseFormData<{
    title: string;
    rawContent: string;
    sourceType?: string;
    fileName?: string;
  }>(formData, ['title', 'rawContent', 'sourceType', 'fileName']);

  // Validate required fields
  if (!data.title?.trim()) {
    throw new ValidationError('Title is required', { title: 'Title is required' });
  }
  if (!data.rawContent?.trim()) {
    throw new ValidationError('Content is required', { rawContent: 'Content is required' });
  }

  // Sanitize inputs
  data.title = sanitizeInput(data.title);
  data.rawContent = sanitizeInput(data.rawContent);

  const response = await apiClient.post<TranscriptView>('/api/transcripts', data);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to create transcript');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.all);
  revalidateTag(CACHE_TAGS.transcripts.list);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  // Convert date strings to Date objects
  const transcript = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(transcript);
});

/**
 * Update existing transcript
 */
export const updateTranscript = withErrorHandling(async (
  id: string,
  formData: FormData
) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  const data = parseFormData<{
    title?: string;
    rawContent?: string;
    cleanedContent?: string;
    status?: string;
  }>(formData, ['title', 'rawContent', 'cleanedContent', 'status']);

  // Sanitize inputs
  if (data.title) data.title = sanitizeInput(data.title);
  if (data.rawContent) data.rawContent = sanitizeInput(data.rawContent);
  if (data.cleanedContent) data.cleanedContent = sanitizeInput(data.cleanedContent);

  const response = await apiClient.patch<TranscriptView>(`/api/transcripts/${id}`, data);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to update transcript');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.all);
  revalidateTag(CACHE_TAGS.transcripts.detail(id));
  if (data.status) {
    revalidateTag(CACHE_TAGS.transcripts.byStatus(data.status));
  }
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  // Convert date strings to Date objects
  const transcript = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(transcript);
});

/**
 * Delete transcript
 */
export const deleteTranscript = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  const response = await apiClient.delete(`/api/transcripts/${id}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete transcript');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.all);
  revalidateTag(CACHE_TAGS.transcripts.detail(id));
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  return createResponse({ id });
});

/**
 * Bulk update transcripts
 */
export const bulkUpdateTranscripts = withErrorHandling(async (
  action: string,
  transcriptIds: string[]
) => {
  await verifyAuth();

  if (!action) {
    throw new ValidationError('Action is required');
  }
  if (!transcriptIds || transcriptIds.length === 0) {
    throw new ValidationError('At least one transcript must be selected');
  }

  const response = await apiClient.post('/api/transcripts/bulk', {
    action,
    transcriptIds
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to perform bulk operation');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.transcripts.all);
  transcriptIds.forEach(id => {
    revalidateTag(CACHE_TAGS.transcripts.detail(id));
  });
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  return createResponse({
    action,
    affectedCount: transcriptIds.length
  });
});