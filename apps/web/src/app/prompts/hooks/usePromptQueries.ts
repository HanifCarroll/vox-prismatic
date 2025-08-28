/**
 * TanStack Query hooks for prompt operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/lib/toast';

export interface PromptTemplate {
  name: string;
  title: string;
  content: string;
  description: string;
  variables: string[];
  lastModified: string;
  exists: boolean;
  size: number;
}

// Query keys
export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: () => [...promptKeys.lists()] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (name: string) => [...promptKeys.details(), name] as const,
};

/**
 * Fetch all prompt templates with content
 */
export function usePrompts() {
  return useQuery({
    queryKey: promptKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<PromptTemplate[]>('/api/prompts');
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch prompts');
      }
      
      return response.data || [];
    },
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Update a prompt template
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const response = await apiClient.put<PromptTemplate>(
        `/api/prompts/${encodeURIComponent(name)}`,
        { content }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update prompt');
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch prompts list
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
      toast.success(`Updated prompt: ${variables.name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update prompt');
    },
  });
}

/**
 * Render a prompt template with variables
 */
export function useRenderPrompt() {
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ 
      name, 
      variables, 
      validate = true 
    }: { 
      name: string; 
      variables: Record<string, string>;
      validate?: boolean;
    }) => {
      const response = await apiClient.post<{
        rendered: string;
        templateName: string;
        variablesUsed: string[];
      }>(`/api/prompts/${encodeURIComponent(name)}/render`, {
        variables,
        validate
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to render prompt');
      }

      return response.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to render prompt');
    },
  });
}