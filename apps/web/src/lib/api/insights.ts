/**
 * Insights API Client
 * Client-side API calls for insights operations
 */

import { getApiBaseUrl } from '../api-config';
import type { InsightView } from '@/types/database';
import type { ApiResponse, Result } from '@/types';
import { InsightStatus, Platform } from '@content-creation/types';
import {
  sanitizeInput,
  parseFormData
} from '../action-helpers';

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function for making API requests
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
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
 * Insights API methods
 */
export const insightsAPI = {
  /**
   * Get all insights
   */
  async getInsights(): Promise<Result<InsightView[]>> {
    try {
      // No parameters needed anymore
      const response = await fetchAPI<InsightView[]>(
        `/api/insights`
      );

      if (!response.success) {
        return {
          success: false,
          error: new Error(response.error || 'Failed to fetch insights')
        };
      }

      // Convert date strings to Date objects
      const insights = response.data?.map((insight) => ({
        ...insight,
        createdAt: new Date(insight.createdAt),
        updatedAt: new Date(insight.updatedAt),
      })) || [];

      return {
        success: true,
        data: insights
      };
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  },

  /**
   * Get single insight by ID
   */
  async getInsight(id: string): Promise<Result<InsightView>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Insight ID is required')
      };
    }

    try {
      const response = await fetchAPI<InsightView>(`/api/insights/${id}`);
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(response.error || 'Failed to fetch insight')
        };
      }

      if (!response.data) {
        return {
          success: false,
          error: new Error('Insight not found')
        };
      }

      // Convert date strings to Date objects
      const insight = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return {
        success: true,
        data: insight
      };
    } catch (error) {
      console.error('Failed to fetch insight:', error);
      throw new Error('Unable to load insight. Please try again.');
    }
  },

  /**
   * Update existing insight
   */
  async updateInsight(
    id: string,
    data: {
      title?: string;
      summary?: string;
      category?: string;
      status?: string;
      scores?: Record<string, number>;
    }
  ): Promise<Result<InsightView>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Insight ID is required')
      };
    }

    // Sanitize inputs
    const sanitizedData = { ...data };
    if (sanitizedData.title) sanitizedData.title = sanitizeInput(sanitizedData.title);
    if (sanitizedData.summary) sanitizedData.summary = sanitizeInput(sanitizedData.summary);
    if (sanitizedData.category) sanitizedData.category = sanitizeInput(sanitizedData.category);

    try {
      const response = await fetchAPI<InsightView>(`/api/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(sanitizedData)
      });
      
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

      // Convert date strings to Date objects
      const insight = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return {
        success: true,
        data: insight
      };
    } catch (error) {
      console.error('Failed to update insight:', error);
      throw new Error('Unable to update insight. Please try again.');
    }
  },

  /**
   * Update insight from FormData
   */
  async updateInsightFromForm(
    id: string,
    formData: FormData
  ): Promise<Result<InsightView>> {
    const data = parseFormData<{
      title?: string;
      summary?: string;
      category?: string;
      status?: string;
      scores?: Record<string, number>;
    }>(formData, ['title', 'summary', 'category', 'status', 'scores']);

    return this.updateInsight(id, data);
  },

  /**
   * Delete insight
   */
  async deleteInsight(id: string): Promise<Result<{ id: string }>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Insight ID is required')
      };
    }

    try {
      const response = await fetchAPI(`/api/insights/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to delete insight')
        };
      }

      return {
        success: true,
        data: { id }
      };
    } catch (error) {
      console.error('Failed to delete insight:', error);
      throw new Error('Unable to delete insight. Please try again.');
    }
  },

  /**
   * Bulk update insights
   */
  async bulkUpdateInsights(
    action: string,
    insightIds: string[]
  ): Promise<Result<{ action: string; affectedCount: number }>> {
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
      const response = await fetchAPI('/api/insights/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action,
          insightIds
        })
      });
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to perform bulk operation')
        };
      }

      return {
        success: true,
        data: {
          action,
          affectedCount: insightIds.length
        }
      };
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw new Error('Unable to perform bulk operation. Please try again.');
    }
  },

  /**
   * Approve insight
   */
  async approveInsight(id: string): Promise<Result<InsightView>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Insight ID is required')
      };
    }

    try {
      const response = await fetchAPI<InsightView>(`/api/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: InsightStatus.APPROVED
        })
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

      const insight = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return {
        success: true,
        data: insight
      };
    } catch (error) {
      console.error('Failed to approve insight:', error);
      throw new Error('Unable to approve insight. Please try again.');
    }
  },

  /**
   * Reject insight
   */
  async rejectInsight(id: string): Promise<Result<InsightView>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Insight ID is required')
      };
    }

    try {
      const response = await fetchAPI<InsightView>(`/api/insights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: InsightStatus.REJECTED
        })
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

      const insight = {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };

      return {
        success: true,
        data: insight
      };
    } catch (error) {
      console.error('Failed to reject insight:', error);
      throw new Error('Unable to reject insight. Please try again.');
    }
  },

  /**
   * Generate posts from insight
   */
  async generatePostsFromInsight(
    id: string, 
    platforms: Platform[] = [Platform.LINKEDIN, Platform.X]
  ): Promise<Result<{ id: string; jobId?: string; message: string; type: string; platforms: Platform[] }>> {
    if (!id) {
      return {
        success: false,
        error: new Error('Insight ID is required')
      };
    }

    try {
      const response = await fetchAPI<{ jobId: string }>(
        `/api/content-processing/insights/${id}/generate-posts`,
        {
          method: 'POST',
          body: JSON.stringify({ platforms })
        }
      );
      
      if (!response.success) {
        return {
          success: false,
          error: new Error(String(response.error) || 'Failed to start post generation')
        };
      }

      return {
        success: true,
        data: { 
          id, 
          jobId: response.data?.jobId,
          message: 'Post generation started',
          type: 'workflow_job',
          platforms
        }
      };
    } catch (error) {
      console.error('Failed to generate posts:', error);
      throw new Error('Unable to start post generation. Please try again.');
    }
  }
};