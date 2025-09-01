import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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

export interface PromptRenderResult {
  content: string;
  renderedContent: string;
}

@Injectable({
  providedIn: 'root'
})
export class PromptsService {
  private readonly api = inject(ApiService);

  /**
   * Fetch all prompt templates
   */
  getPrompts(): Observable<PromptTemplate[]> {
    return this.api.get<PromptTemplate[]>('/prompts');
  }

  /**
   * Fetch a single prompt template by name
   */
  getPrompt(name: string): Observable<PromptTemplate> {
    return this.api.get<PromptTemplate>(`/prompts/${name}`);
  }

  /**
   * Update a prompt template
   */
  updatePrompt(name: string, content: string): Observable<PromptTemplate> {
    return this.api.put<PromptTemplate>(`/prompts/${name}`, { content });
  }

  /**
   * Create a new prompt template
   */
  createPrompt(
    name: string,
    content: string,
    title?: string,
    description?: string
  ): Observable<PromptTemplate> {
    return this.api.post<PromptTemplate>('/prompts', {
      name,
      content,
      title,
      description
    });
  }

  /**
   * Delete a prompt template
   */
  deletePrompt(name: string): Observable<void> {
    return this.api.delete<void>(`/prompts/${name}`);
  }

  /**
   * Render a prompt template with variables
   */
  renderPrompt(
    name: string,
    variables: Record<string, string>
  ): Observable<PromptRenderResult> {
    return this.api.post<PromptRenderResult>(`/prompts/${name}/render`, { variables });
  }

  /**
   * Extract variables from prompt content
   */
  extractVariables(content: string): string[] {
    if (!content || typeof content !== 'string') return [];
    const matches = content.match(/{{(\w+)}}/g);
    if (!matches) return [];
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
  }

  /**
   * Get prompt category for visual distinction
   */
  getPromptCategory(name: string): { label: string; color: string } {
    if (name.includes('transcript')) {
      return { label: 'Processing', color: 'info' };
    }
    if (name.includes('insight')) {
      return { label: 'Analysis', color: 'warning' };
    }
    if (name.includes('post')) {
      return { label: 'Generation', color: 'success' };
    }
    return { label: 'General', color: 'secondary' };
  }

  /**
   * Format prompt name for display
   */
  formatPromptName(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Validate prompt content
   */
  validatePrompt(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('Prompt content cannot be empty');
    }
    
    // Check for unclosed variables
    const openBraces = (content.match(/{{/g) || []).length;
    const closeBraces = (content.match(/}}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched variable brackets');
    }
    
    // Check for invalid variable names
    const variables = this.extractVariables(content);
    variables.forEach(variable => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)) {
        errors.push(`Invalid variable name: ${variable}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate prompt metrics
   */
  getPromptMetrics(content: string): {
    characterCount: number;
    wordCount: number;
    variableCount: number;
    estimatedTokens: number;
  } {
    const characterCount = content.length;
    const wordCount = content.trim().split(/\s+/).length;
    const variableCount = this.extractVariables(content).length;
    // Rough estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(characterCount / 4);
    
    return {
      characterCount,
      wordCount,
      variableCount,
      estimatedTokens
    };
  }
}