'use server';

import { revalidatePath } from 'next/cache';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@content-creation/types';

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
 * Fetch all prompt templates
 * This is used by the server component page.tsx
 */
export async function getPrompts(): Promise<ApiResponse<PromptTemplate[]>> {
  try {
    const response = await apiClient.get<PromptTemplate[]>('/api/prompts');
    return response;
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prompts'
    };
  }
}

/**
 * Fetch a single prompt template by name
 */
export async function getPrompt(name: string): Promise<ApiResponse<PromptTemplate>> {
  try {
    const response = await apiClient.get<PromptTemplate>(`/api/prompts/${name}`);
    return response;
  } catch (error) {
    console.error(`Failed to fetch prompt ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prompt'
    };
  }
}

/**
 * Update a prompt template
 * Server action that updates a prompt and revalidates the page
 */
export async function updatePrompt(
  name: string,
  content: string
): Promise<ApiResponse<PromptTemplate>> {
  try {
    // Update the prompt via API
    const response = await apiClient.put<PromptTemplate>(
      `/api/prompts/${name}`,
      { content }
    );
    
    if (response.success) {
      // Revalidate the prompts page to show updated data
      revalidatePath('/prompts');
    }
    
    return response;
  } catch (error) {
    console.error(`Failed to update prompt ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update prompt'
    };
  }
}

/**
 * Create a new prompt template
 */
export async function createPrompt(
  name: string,
  content: string,
  title?: string,
  description?: string
): Promise<ApiResponse<PromptTemplate>> {
  try {
    const response = await apiClient.post<PromptTemplate>(
      '/api/prompts',
      { name, content, title, description }
    );
    
    if (response.success) {
      revalidatePath('/prompts');
    }
    
    return response;
  } catch (error) {
    console.error(`Failed to create prompt ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create prompt'
    };
  }
}

/**
 * Delete a prompt template
 */
export async function deletePrompt(name: string): Promise<ApiResponse<void>> {
  try {
    const response = await apiClient.delete<void>(`/api/prompts/${name}`);
    
    if (response.success) {
      revalidatePath('/prompts');
    }
    
    return response;
  } catch (error) {
    console.error(`Failed to delete prompt ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete prompt'
    };
  }
}

/**
 * Render a prompt template with variables
 */
export async function renderPrompt(
  name: string,
  variables: Record<string, string>
): Promise<ApiResponse<{ content: string; renderedContent: string }>> {
  try {
    const response = await apiClient.post<{ content: string; renderedContent: string }>(
      `/api/prompts/${name}/render`,
      { variables }
    );
    
    return response;
  } catch (error) {
    console.error(`Failed to render prompt ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to render prompt'
    };
  }
}

/**
 * Validate prompt template variables
 */
export async function validatePrompt(
  name: string,
  variables: Record<string, string>
): Promise<ApiResponse<{
  isValid: boolean;
  requiredVariables: string[];
  providedVariables: string[];
  missingVariables: string[];
  extraVariables: string[];
}>> {
  try {
    const response = await apiClient.get<{
      isValid: boolean;
      requiredVariables: string[];
      providedVariables: string[];
      missingVariables: string[];
      extraVariables: string[];
    }>(`/api/prompts/${name}/validate?variables=${JSON.stringify(variables)}`);
    
    return response;
  } catch (error) {
    console.error(`Failed to validate prompt ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate prompt'
    };
  }
}