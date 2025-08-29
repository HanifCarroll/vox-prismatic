'use server';

import { apiClient } from '@/lib/api-client';
import type { TranscriptView } from '@/types/database';
import type { ApiResponseWithMetadata, Result } from '@/types';
import {
  createResponse,
  sanitizeInput,
  validatePagination
} from '../lib/action-utils';

/**
 * Transcript Read Operations
 * Server actions for fetching transcript data
 */

/**
 * Get transcripts with filtering and pagination
 */
export async function getTranscripts(params?: {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<Result<TranscriptView[]> & { meta?: any }> {
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

  try {
    const response = await apiClient.get<TranscriptView[]>(endpoint) as ApiResponseWithMetadata<TranscriptView> & {
      error?: string;
    };

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch transcripts'
      };
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
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch transcripts:', error);
    throw new Error('Unable to load transcripts. Please try again.');
  }
}

/**
 * Get single transcript by ID
 */
export async function getTranscript(id: string): Promise<Result<TranscriptView>> {
  // Validation returns Result
  if (!id) {
    return {
      success: false,
      error: 'Transcript ID is required'
    };
  }

  // Auth not implemented yet

  try {
    const response = await apiClient.get<TranscriptView>(`/api/transcripts/${id}`);
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch transcript'
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'Transcript not found'
      };
    }

    // Convert date strings to Date objects
    const transcript = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    };

    return createResponse(transcript);
  } catch (error) {
    // Network/system errors throw for error boundary
    console.error('Failed to fetch transcript:', error);
    throw new Error('Unable to load transcript. Please try again.');
  }
}