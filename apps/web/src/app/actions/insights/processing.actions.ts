'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import { workflowApi } from '@/lib/workflow-api';
import type { InsightView } from '@/types/database';
import { InsightStatus, Platform } from '@content-creation/types';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  CACHE_TAGS,
  ValidationError
} from '../lib/action-utils';

/**
 * Insight Processing Operations
 * Server actions for insight processing operations like approval, rejection, and post generation
 */

/**
 * Approve insight
 */
export const approveInsight = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Insight ID is required');
  }

  const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, {
    status: InsightStatus.APPROVED
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to approve insight');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.insights.detail(id));
  revalidateTag(CACHE_TAGS.insights.byStatus('approved'));
  revalidateTag(CACHE_TAGS.insights.byStatus('ready'));
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  const insight = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(insight);
});

/**
 * Reject insight
 */
export const rejectInsight = withErrorHandling(async (id: string) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Insight ID is required');
  }

  const response = await apiClient.patch<InsightView>(`/api/insights/${id}`, {
    status: InsightStatus.REJECTED
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to reject insight');
  }

  // Revalidate caches
  revalidateTag(CACHE_TAGS.insights.detail(id));
  revalidateTag(CACHE_TAGS.insights.byStatus('rejected'));
  revalidateTag(CACHE_TAGS.insights.byStatus('ready'));
  revalidatePath('/content');

  if (!response.data) {
    throw new Error('No data returned from server');
  }

  const insight = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(insight);
});

/**
 * Generate posts from insight using workflow API
 */
export const generatePostsFromInsight = withErrorHandling(async (
  id: string, 
  platforms: Platform[] = [Platform.LINKEDIN, Platform.X]
) => {
  await verifyAuth();

  if (!id) {
    throw new ValidationError('Insight ID is required');
  }

  const response = await workflowApi.insights.generatePosts(id, platforms);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to start post generation');
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
});