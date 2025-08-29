'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { InsightView } from '@/types/database';
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
 * Insight Write Operations
 * Server actions for creating, updating, and deleting insights
 */

/**
 * Update existing insight
 */
export const updateInsight = withErrorHandling(async (
  id: string,
  formData: FormData
) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Insight ID is required');
  }

  const data = parseFormData<{
    title?: string;
    summary?: string;
    category?: string;
    status?: string;
    scores?: any;
  }>(formData, ['title', 'summary', 'category', 'status', 'scores']);

  // Sanitize inputs
  if (data.title) data.title = sanitizeInput(data.title);
  if (data.summary) data.summary = sanitizeInput(data.summary);
  if (data.category) data.category = sanitizeInput(data.category);

  const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, data);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to update insight');
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

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  // Convert date strings to Date objects
  const insight = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(insight);
});

/**
 * Delete insight
 */
export const deleteInsight = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Insight ID is required');
  }

  const response = await apiClient.delete(`/api/insights/${id}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete insight');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.insights.all);
  revalidateTag(CACHE_TAGS.insights.detail(id));
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.sidebar);
  revalidatePath('/content');

  return createResponse({ id });
});

/**
 * Bulk update insights
 */
export const bulkUpdateInsights = withErrorHandling(async (
  action: string,
  insightIds: string[]
) => {
  await verifyAuth();

  if (!action) {
    throw new ValidationError('Action is required');
  }
  if (!insightIds || insightIds.length === 0) {
    throw new ValidationError('At least one insight must be selected');
  }

  const response = await apiClient.post('/api/insights/bulk', {
    action,
    insightIds
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to perform bulk operation');
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
});