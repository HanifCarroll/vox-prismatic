'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import { workflowApi } from '@/lib/workflow-api';
import type { InsightView } from '@/types/database';
import type { Result } from '@/types';
import { InsightStatus, Platform } from '@content-creation/types';
import {
  createResponse,
  CACHE_TAGS
} from '@/lib/action-helpers';

/**
 * Insight Processing Operations
 * Server actions for insight processing operations like approval, rejection, and post generation
 */

/**
 * Approve insight
 */
export async function approveInsight(id: string): Promise<Result<InsightView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Insight ID is required')
    };
  }

  try {
    const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, {
      status: InsightStatus.APPROVED
    });
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to approve insight')
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: new Error('No data returned from server')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.insights.detail(id));
    revalidateTag(CACHE_TAGS.insights.byStatus('approved'));
    revalidateTag(CACHE_TAGS.insights.byStatus('ready'));
    revalidatePath('/content');

    const insight = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(insight);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to approve insight:', error);
    throw new Error('Unable to approve insight. Please try again.');
  }
}

/**
 * Reject insight
 */
export async function rejectInsight(id: string): Promise<Result<InsightView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Insight ID is required')
    };
  }

  try {
    const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, {
      status: InsightStatus.REJECTED
    });
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to reject insight')
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: new Error('No data returned from server')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.insights.detail(id));
    revalidateTag(CACHE_TAGS.insights.byStatus('rejected'));
    revalidateTag(CACHE_TAGS.insights.byStatus('ready'));
    revalidatePath('/content');

    const insight = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(insight);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to reject insight:', error);
    throw new Error('Unable to reject insight. Please try again.');
  }
}

/**
 * Generate posts from insight using workflow API
 */
export async function generatePostsFromInsight(
  id: string, 
  platforms: Platform[] = [Platform.LINKEDIN, Platform.X]
): Promise<Result<{ id: string; jobId?: string; message: string; type: string; platforms: Platform[] }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Insight ID is required')
    };
  }

  try {
    const response = await workflowApi.insights.generatePosts(id, platforms);
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to start post generation')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.insights.detail(id));
    revalidateTag(CACHE_TAGS.posts.all);
    revalidateTag(CACHE_TAGS.dashboard);
    revalidatePath('/content');

    return createResponse({ 
      id, 
      jobId: response.data?.jobId,
      message: 'Post generation started',
      type: 'workflow_job',
      platforms
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to generate posts:', error);
    throw new Error('Unable to start post generation. Please try again.');
  }
}