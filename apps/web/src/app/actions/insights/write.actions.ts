'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { InsightView } from '@/types/database';
import type { Result } from '@/types';
import {
  createResponse,
  CACHE_TAGS,
  sanitizeInput,
  parseFormData
} from '@/lib/action-helpers';

/**
 * Insight Write Operations
 * Server actions for creating, updating, and deleting insights
 */

/**
 * Update existing insight
 */
export async function updateInsight(
  id: string,
  formData: FormData
): Promise<Result<InsightView>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Insight ID is required')
    };
  }

  const data = parseFormData<{
    title?: string;
    summary?: string;
    category?: string;
    status?: string;
    scores?: Record<string, number>;
  }>(formData, ['title', 'summary', 'category', 'status', 'scores']);

  // Sanitize inputs
  if (data.title) data.title = sanitizeInput(data.title);
  if (data.summary) data.summary = sanitizeInput(data.summary);
  if (data.category) data.category = sanitizeInput(data.category);

  try {
    const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, data);
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to update insight')
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: new Error('No data returned from server')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.insights.all);
    revalidateTag(CACHE_TAGS.insights.detail(id));
    if (data.status) {
      revalidateTag(CACHE_TAGS.insights.byStatus(data.status));
    }
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    // Convert date strings to Date objects
    const insight = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(insight);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to update insight:', error);
    throw new Error('Unable to update insight. Please try again.');
  }
}

/**
 * Delete insight
 */
export async function deleteInsight(id: string): Promise<Result<{ id: string }>> {
  // Auth not implemented yet

  if (!id) {
    return {
      success: false,
      error: new Error('Insight ID is required')
    };
  }

  try {
    const response = await apiClient.delete(`/api/insights/${id}`);
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to delete insight')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.insights.all);
    revalidateTag(CACHE_TAGS.insights.detail(id));
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    return createResponse({ id });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to delete insight:', error);
    throw new Error('Unable to delete insight. Please try again.');
  }
}

/**
 * Bulk update insights
 */
export async function bulkUpdateInsights(
  action: string,
  insightIds: string[]
): Promise<Result<{ action: string; affectedCount: number }>> {
  // Auth not implemented yet

  if (!action) {
    return {
      success: false,
      error: new Error('Action is required')
    };
  }
  if (!insightIds || insightIds.length === 0) {
    return {
      success: false,
      error: new Error('At least one insight must be selected')
    };
  }

  try {
    const response = await apiClient.post('/api/insights/bulk', {
      action,
      insightIds
    });
    
    if (!response.success) {
      return {
        success: false,
        error: new Error(String(response.error) || 'Failed to perform bulk operation')
      };
    }

    // Revalidate caches
    revalidateTag(CACHE_TAGS.insights.all);
    insightIds.forEach(id => {
      revalidateTag(CACHE_TAGS.insights.detail(id));
    });
    revalidateTag(CACHE_TAGS.dashboard);
    revalidateTag(CACHE_TAGS.sidebar);
    revalidatePath('/content');

    return createResponse({
      action,
      affectedCount: insightIds.length
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to perform bulk operation:', error);
    throw new Error('Unable to perform bulk operation. Please try again.');
  }
}