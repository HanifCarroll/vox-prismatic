/**
 * Prompts API Client
 * Client functions to interact with the API server's prompts endpoints
 */

import { getApiBaseUrl } from '../api-config';

const API_BASE_URL = getApiBaseUrl();

export interface PromptTemplate {
  name: string;
  title: string;
  description: string;
  variables: string[];
  lastModified: string;
  exists: boolean;
  size: number;
}

export interface PromptContent {
  name: string;
  title?: string;
  content: string;
  variables: string[];
  description: string;
  lastModified: string;
  size: number;
}

export interface RenderResult {
  rendered: string;
  templateName: string;
  variablesUsed: string[];
}

/**
 * Fetch all available prompt templates
 */
export async function fetchPromptTemplates(): Promise<PromptTemplate[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch templates');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    throw error;
  }
}

/**
 * Fetch a specific prompt template content
 */
export async function fetchPromptContent(templateName: string): Promise<PromptContent> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${encodeURIComponent(templateName)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Template not found');
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch template content');
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error fetching template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Render a prompt template with variables
 */
export async function renderPromptTemplate(
  templateName: string, 
  variables: Record<string, string>,
  validate: boolean = true
): Promise<RenderResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${encodeURIComponent(templateName)}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables,
        validate
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400 && errorData.missingVariables) {
        throw new Error(`Missing required variables: ${errorData.missingVariables.join(', ')}`);
      }
      if (response.status === 404) {
        throw new Error('Template not found');
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to render template');
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Update a prompt template content
 */
export async function updatePromptTemplate(
  templateName: string, 
  content: string
): Promise<{ name: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${encodeURIComponent(templateName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content
      })
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Template not found');
      }
      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid request');
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update template');
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error updating template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Validate variables for a template
 */
export async function validatePromptVariables(
  templateName: string,
  variables: Record<string, string>
): Promise<{
  isValid: boolean;
  missingVariables: string[];
  requiredVariables: string[];
  providedVariables: string[];
}> {
  try {
    const queryParams = new URLSearchParams({
      variables: JSON.stringify(variables)
    });
    
    const response = await fetch(`${API_BASE_URL}/api/prompts/${encodeURIComponent(templateName)}/validate?${queryParams}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Template not found');
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to validate template');
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error validating template ${templateName}:`, error);
    throw error;
  }
}