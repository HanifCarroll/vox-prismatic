'use server';

import { apiClient } from '@/lib/api-client';
import type { InsightView } from '@/types/database';
import type { ApiResponseWithMetadata, Result } from '@/types';
import {
  createResponse,
  sanitizeInput,
  validatePagination
} from '@/lib/action-helpers';

/**
 * Insight Read Operations
 * Server actions for fetching insight data
 */

/**
 * Get insights with filtering and pagination
 */
export async function getInsights(params?: {
  status?: string;
  category?: string;
  postType?: string;
  scoreMin?: number;
  scoreMax?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  transcriptId?: string;
  page?: number;
  limit?: number;
}): Promise<Result<InsightView[]> & { meta?: any }> {
  // Auth not implemented yet

  const { page, limit, offset } = validatePagination({
    page: params?.page,
    limit: params?.limit
  });

  // Build query parameters
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    searchParams.append('status', params.status);
  }
  if (params?.category && params.category !== 'all') {
    searchParams.append('category', params.category);
  }
  if (params?.postType && params.postType !== 'all') {
    searchParams.append('postType', params.postType);
  }
  if (params?.scoreMin !== undefined && params.scoreMin > 0) {
    searchParams.append('scoreMin', String(params.scoreMin));
  }
  if (params?.scoreMax !== undefined && params.scoreMax < 20) {
    searchParams.append('scoreMax', String(params.scoreMax));
  }
  if (params?.search) {
    searchParams.append('search', sanitizeInput(params.search));
  }
  if (params?.transcriptId) {
    searchParams.append('transcriptId', params.transcriptId);
  }
  if (params?.sortBy) {
    searchParams.append('sortBy', params.sortBy);
  }
  if (params?.sortOrder) {
    searchParams.append('sortOrder', params.sortOrder);
  }
  searchParams.append('limit', String(limit));
  searchParams.append('offset', String(offset));

  const queryString = searchParams.toString();
  const endpoint = `/api/insights${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await apiClient.get<InsightView[]>(endpoint) as ApiResponseWithMetadata<InsightView> & {
      error?: string;
    };

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch insights'
      };
    }

    // Convert date strings to Date objects
    const insights = response.data.map((insight) => ({
      ...insight,
      createdAt: new Date(insight.createdAt),
      updatedAt: new Date(insight.updatedAt),
    }));

    return createResponse(insights, {
      pagination: {
        page,
        limit,
        total: response.meta.pagination.total,
        totalPages: response.meta.pagination.totalPages,
        hasMore: response.meta.pagination.hasMore
      }
    });
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch insights:', error);
    throw new Error('Unable to load insights. Please try again.');
  }
}

/**
 * Get single insight by ID
 */
export async function getInsight(id: string): Promise<Result<InsightView>> {
  if (!id) {
    return {
      success: false,
      error: 'Insight ID is required'
    };
  }

  // Auth not implemented yet

  try {
    const response = await apiClient.get<InsightView>(`/api/insights/${id}`);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch insight'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'Insight not found'
      };
    }

    // Convert date strings to Date objects
    const insight = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(insight);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch insight:', error);
    throw new Error('Unable to load insight. Please try again.');
  }
}