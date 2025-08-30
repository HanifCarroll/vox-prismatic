/**
 * Prompts API Client
 * Client-side API calls for prompts operations
 */

import { getApiBaseUrl } from '../api-config';
import type { ApiResponse } from '@content-creation/types';

const API_BASE_URL = getApiBaseUrl();

// Define PromptTemplate type to match what's used in the page
export interface PromptTemplate {
  name: string;
  content: string;
  variables: string[];
  title: string;
  description: string;
  lastModified: string;
  exists: boolean;
  size: number;
}

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

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Prompts API methods
 */
export const promptsAPI = {
  /**
   * Fetch all prompt templates
   */
  async getPrompts(): Promise<ApiResponse<PromptTemplate[]>> {
    try {
      return await fetchAPI<PromptTemplate[]>('/api/prompts');
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prompts'
      };
    }
  },

  /**
   * Fetch a single prompt template by name
   */
  async getPrompt(name: string): Promise<ApiResponse<PromptTemplate>> {
    try {
      return await fetchAPI<PromptTemplate>(`/api/prompts/${name}`);
    } catch (error) {
      console.error(`Failed to fetch prompt ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prompt'
      };
    }
  },

  /**
   * Update a prompt template
   */
  async updatePrompt(
    name: string,
    content: string
  ): Promise<ApiResponse<PromptTemplate>> {
    try {
      return await fetchAPI<PromptTemplate>(
        `/api/prompts/${name}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content })
        }
      );
    } catch (error) {
      console.error(`Failed to update prompt ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update prompt'
      };
    }
  },

  /**
   * Create a new prompt template
   */
  async createPrompt(
    name: string,
    content: string,
    title?: string,
    description?: string
  ): Promise<ApiResponse<PromptTemplate>> {
    try {
      return await fetchAPI<PromptTemplate>(
        '/api/prompts',
        {
          method: 'POST',
          body: JSON.stringify({ name, content, title, description })
        }
      );
    } catch (error) {
      console.error(`Failed to create prompt ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create prompt'
      };
    }
  },

  /**
   * Delete a prompt template
   */
  async deletePrompt(name: string): Promise<ApiResponse<void>> {
    try {
      return await fetchAPI<void>(`/api/prompts/${name}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to delete prompt ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete prompt'
      };
    }
  },

  /**
   * Render a prompt template with variables
   */
  async renderPrompt(
    name: string,
    variables: Record<string, string>
  ): Promise<ApiResponse<{ content: string; renderedContent: string }>> {
    try {
      return await fetchAPI<{ content: string; renderedContent: string }>(
        `/api/prompts/${name}/render`,
        {
          method: 'POST',
          body: JSON.stringify({ variables })
        }
      );
    } catch (error) {
      console.error(`Failed to render prompt ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to render prompt'
      };
    }
  }
};