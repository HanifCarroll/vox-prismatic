/**
 * Transcripts API Client
 * Client-side API calls for transcripts operations
 */

import { getApiBaseUrl } from '../api-config';
import type { TranscriptView } from '@/types/database';
import type { ApiResponseWithMetadata, Result } from '@/types';
import { TranscriptStatus } from '@content-creation/types';
import {
  createResponse,
  sanitizeInput,
  validatePagination,
  parseFormData
} from '../action-helpers';

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function for making API requests
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponseWithMetadata<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Transcripts API methods
 */
export const transcriptsAPI = {
  /**
   * Get transcripts with filtering and pagination
   */
  async getTranscripts(params?: {
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<Result<TranscriptView[]> & { meta?: any }> {
    try {
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

      const response = await fetchAPI<TranscriptView>(endpoint);

      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to fetch transcripts')
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
      console.error('Failed to fetch transcripts:', error);
      throw new Error('Unable to load transcripts. Please try again.');
    }
  },

  /**
   * Get single transcript by ID
   */
  async getTranscript(id: string): Promise<Result<TranscriptView>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Transcript ID is required')
      };
    }

    try {
      const response = await fetchAPI<TranscriptView>(`/api/transcripts/${id}`);
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to fetch transcript')
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: new Error('Transcript not found')
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
      console.error('Failed to fetch transcript:', error);
      throw new Error('Unable to load transcript. Please try again.');
    }
  },

  /**
   * Create new transcript
   */
  async createTranscript(data: {
    title: string;
    rawContent: string;
    sourceType?: string;
    fileName?: string;
  }): Promise<Result<TranscriptView>> {
    // Validate required fields
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
    const sanitizedData = {
      ...data,
      title: sanitizeInput(data.title),
      rawContent: sanitizeInput(data.rawContent)
    };

    try {
      const response = await fetchAPI<TranscriptView>('/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(sanitizedData)
      });
      
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

      // Convert date strings to Date objects
      const transcript = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return createResponse(transcript);
    } catch (error) {
      console.error('Failed to create transcript:', error);
      throw new Error('Unable to create transcript. Please try again.');
    }
  },

  /**
   * Create transcript from FormData
   */
  async createTranscriptFromForm(formData: FormData): Promise<Result<TranscriptView>> {
    const data = parseFormData<{
      title: string;
      rawContent: string;
      sourceType?: string;
      fileName?: string;
    }>(formData, ['title', 'rawContent', 'sourceType', 'fileName']);

    return this.createTranscript(data);
  },

  /**
   * Update existing transcript
   */
  async updateTranscript(
    id: string,
    data: {
      title?: string;
      rawContent?: string;
      cleanedContent?: string;
      status?: string;
    }
  ): Promise<Result<TranscriptView>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Transcript ID is required')
      };
    }

    // Sanitize inputs
    const sanitizedData = { ...data };
    if (sanitizedData.title) sanitizedData.title = sanitizeInput(sanitizedData.title);
    if (sanitizedData.rawContent) sanitizedData.rawContent = sanitizeInput(sanitizedData.rawContent);
    if (sanitizedData.cleanedContent) sanitizedData.cleanedContent = sanitizeInput(sanitizedData.cleanedContent);

    try {
      const response = await fetchAPI<TranscriptView>(`/api/transcripts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(sanitizedData)
      });
      
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

      // Convert date strings to Date objects
      const transcript = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return createResponse(transcript);
    } catch (error) {
      console.error('Failed to update transcript:', error);
      throw new Error('Unable to update transcript. Please try again.');
    }
  },

  /**
   * Update transcript from FormData
   */
  async updateTranscriptFromForm(
    id: string,
    formData: FormData
  ): Promise<Result<TranscriptView>> {
    const data = parseFormData<{
      title?: string;
      rawContent?: string;
      cleanedContent?: string;
      status?: string;
    }>(formData, ['title', 'rawContent', 'cleanedContent', 'status']);

    return this.updateTranscript(id, data);
  },

  /**
   * Delete transcript
   */
  async deleteTranscript(id: string): Promise<Result<{ id: string }>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Transcript ID is required')
      };
    }

    try {
      const response = await fetchAPI(`/api/transcripts/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to delete transcript')
        };
      }

      return createResponse({ id });
    } catch (error) {
      console.error('Failed to delete transcript:', error);
      throw new Error('Unable to delete transcript. Please try again.');
    }
  },

  /**
   * Bulk update transcripts
   */
  async bulkUpdateTranscripts(
    action: string,
    transcriptIds: string[]
  ): Promise<Result<{ action: string; affectedCount: number }>> {
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
      const response = await fetchAPI('/api/transcripts/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action,
          transcriptIds
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to perform bulk operation')
        };
      }

      return createResponse({
        action,
        affectedCount: transcriptIds.length
      });
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw new Error('Unable to perform bulk operation. Please try again.');
    }
  },

  /**
   * Clean transcript content using workflow API
   */
  async cleanTranscript(id: string): Promise<Result<{ id: string; jobId?: string; message: string }>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Transcript ID is required')
      };
    }

    try {
      const response = await fetchAPI<{ jobId: string }>(
        `/api/content-processing/transcripts/${id}/clean`,
        {
          method: 'POST'
        }
      );
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to start transcript cleaning')
        };
      }

      return createResponse({
        id,
        jobId: response.data?.jobId,
        message: 'Transcript cleaning started'
      });
    } catch (error) {
      console.error('Failed to clean transcript:', error);
      throw new Error('Unable to start transcript cleaning. Please try again.');
    }
  },

  /**
   * Generate insights from transcript using workflow API
   */
  async generateInsightsFromTranscript(id: string): Promise<Result<{ id: string; jobId?: string; message: string }>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Transcript ID is required')
      };
    }

    try {
      const response = await fetchAPI<{ jobId: string }>(
        `/api/content-processing/transcripts/${id}/insights`,
        {
          method: 'POST'
        }
      );
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to start insight generation')
        };
      }

      return createResponse({
        id,
        jobId: response.data?.jobId,
        message: 'Insight generation started'
      });
    } catch (error) {
      console.error('Failed to generate insights:', error);
      throw new Error('Unable to start insight generation. Please try again.');
    }
  }
};