'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { TranscriptView } from '@/types/database';
import type { Result } from '@/types';
import {
  createResponse,
  CACHE_TAGS,
  sanitizeInput,
  parseFormData
} from '@/lib/action-helpers';

/**
 * Transcript Write Operations
 * Server actions for creating, updating, and deleting transcripts
 */

/**
 * Create new transcript
 */
export async function createTranscript(formData: FormData): Promise<Result<TranscriptView>> {
  // Auth not implemented yet

  const data = parseFormData<{
    title: string;
    rawContent: string;
    sourceType?: string;
    fileName?: string;
  }>(formData, ['title', 'rawContent', 'sourceType', 'fileName']);

  // Validate required fields - return Result for validation errors
  if (!data.title?.trim()) {
    return {
      success: false,
      error: new Error('Title is required')
    };
  }
  if (!data.rawContent?.trim()) {
    return {
      success: false,
      error: new Error('Content is required')
    };
  }

  // Sanitize inputs
  data.title = sanitizeInput(data.title);
  data.rawContent = sanitizeInput(data.rawContent);

  try {
    const response = await apiClient.post<TranscriptView>('/api/transcripts', data);
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to create transcript')
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: new Error('No data returned from server')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.transcripts.all);
    revalidateTag(CACHE_TAGS.transcripts.list);
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    // Convert date strings to Date objects
    const transcript = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(transcript);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to create transcript:', error);
    throw new Error('Unable to create transcript. Please try again.');
  }
}

/**
 * Update existing transcript
 */
export async function updateTranscript(
  id: string,
  formData: FormData
): Promise<Result<TranscriptView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Transcript ID is required')
    };
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

  try {
    const response = await apiClient.patch<TranscriptView>(`/api/transcripts/${id}`, data);
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to update transcript')
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: new Error('No data returned from server')
      };
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

    // Convert date strings to Date objects
    const transcript = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(transcript);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to update transcript:', error);
    throw new Error('Unable to update transcript. Please try again.');
  }
}

/**
 * Delete transcript
 */
export async function deleteTranscript(id: string): Promise<Result<{ id: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Transcript ID is required')
    };
  }

  try {
    const response = await apiClient.delete(`/api/transcripts/${id}`);
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to delete transcript')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.transcripts.all);
    revalidateTag(CACHE_TAGS.transcripts.detail(id));
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    return createResponse({ id });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to delete transcript:', error);
    throw new Error('Unable to delete transcript. Please try again.');
  }
}

/**
 * Bulk update transcripts
 */
export async function bulkUpdateTranscripts(
  action: string,
  transcriptIds: string[]
): Promise<Result<{ action: string; affectedCount: number }>> {
  // Auth not implemented yet

  if (!action) {
    return {
      success: false,
      error: new Error('Action is required')
    };
  }
  if (!transcriptIds || transcriptIds.length === 0) {
    return {
      success: false,
      error: new Error('At least one transcript must be selected')
    };
  }

  try {
    const response = await apiClient.post('/api/transcripts/bulk', {
      action,
      transcriptIds
    });
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to perform bulk operation')
      };
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
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to perform bulk operation:', error);
    throw new Error('Unable to perform bulk operation. Please try again.');
  }
}