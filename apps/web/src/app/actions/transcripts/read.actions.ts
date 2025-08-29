'use server';

import { apiClient } from '@/lib/api-client';
import type { TranscriptView } from '@/types/database';
import type { ApiResponseWithMetadata } from '@/types';
import {
  verifyAuth,
  withErrorHandling,
  createResponse,
  createErrorResponse,
  sanitizeInput,
  validatePagination,
  ValidationError
} from '../lib/action-utils';

/**
 * Transcript Read Operations
 * Server actions for fetching transcript data
 */

/**
 * Get transcripts with filtering and pagination
 */
export const getTranscripts = withErrorHandling(async (params?: {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) => {
  // Auth is optional for reading
  try {
    await verifyAuth();
  } catch {
    // Continue without auth
  }

  const { page, limit, offset } = validatePagination({
    page: params?.page,
    limit: params?.limit
  });

  // Build query parameters
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    searchParams.append('status', params.status);
  }
  if (params?.search) {
    searchParams.append('search', sanitizeInput(params.search));
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
  const endpoint = `/api/transcripts${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<TranscriptView[]>(endpoint) as ApiResponseWithMetadata<TranscriptView> & {
    error?: string;
  };

  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch transcripts');
  }

  // Convert date strings to Date objects
  const transcripts = response.data.map((transcript) => ({
    ...transcript,
    createdAt: new Date(transcript.createdAt),
    updatedAt: new Date(transcript.updatedAt),
  }));

  return createResponse(transcripts, {
    pagination: {
      page,
      limit,
      total: response.meta.pagination.total,
      totalPages: response.meta.pagination.totalPages,
      hasMore: response.meta.pagination.hasMore
    }
  });
});

/**
 * Get single transcript by ID
 */
export const getTranscript = withErrorHandling(async (id: string) => {
  if (!id) {
    throw new ValidationError('Transcript ID is required');
  }

  // Auth is optional for reading
  try {
    await verifyAuth();
  } catch {
    // Continue without auth
  }

  const response = await apiClient.get<TranscriptView>(`/api/transcripts/${id}`);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch transcript');
  }

  if (!response.data) {
    return createErrorResponse('Transcript not found', 'NOT_FOUND', 404);
  }

  // Convert date strings to Date objects
  const transcript = {
    ...response.data,
    createdAt: new Date(response.data.createdAt),
    updatedAt: new Date(response.data.updatedAt),
  };

  return createResponse(transcript);
});