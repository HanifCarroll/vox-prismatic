'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { workflowApi } from '@/lib/workflow-api';
import type { Result } from '@/types';
import {
  createResponse,
  CACHE_TAGS
} from '@/lib/action-helpers';

/**
 * Transcript Processing Operations
 * Server actions for transcript processing operations like cleaning and insight generation
 */

/**
 * Clean transcript content using workflow API
 */
export async function cleanTranscript(id: string): Promise<Result<{ id: string; jobId?: string; message: string; type: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Transcript ID is required'
    };
  }

  try {
    const response = await workflowApi.transcripts.clean(id);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to start transcript cleaning'
      };
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
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to clean transcript:', error);
    throw new Error('Unable to start transcript cleaning. Please try again.');
  }
}

/**
 * Generate insights from transcript using workflow API
 */
export async function generateInsightsFromTranscript(id: string): Promise<Result<{ id: string; jobId?: string; message: string; type: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: 'Transcript ID is required'
    };
  }

  try {
    const response = await workflowApi.transcripts.generateInsights(id);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to start insight generation'
      };
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
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to generate insights:', error);
    throw new Error('Unable to start insight generation. Please try again.');
  }
}