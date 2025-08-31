
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PromptsClient } from "@/components/prompts/PromptsClient";
import { api, type PromptTemplate } from "@/lib/api";

export type { PromptTemplate as Prompt };

/**
 * Prompts page - Manage and edit prompt templates
 * Uses React Query for data fetching
 */

async function fetchPrompts(): Promise<PromptTemplate[]> {
  try {
    // Use API client to fetch prompts
    const response = await api.prompts.getPrompts();

    if (!response.success) {
      console.error("Failed to fetch prompts:", response.error);
      throw new Error(response.error || "Failed to fetch prompts");
    }

    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch prompts from API:", error);
    throw error;
  }
}

export function PromptsPage() {
  const [searchParams] = useSearchParams();
  const promptParam = searchParams.get('prompt');

  const { data: prompts = [], isLoading, error } = useQuery({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
    staleTime: 60000, // Consider data stale after 1 minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">
          Failed to load prompts: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <PromptsClient prompts={prompts} initialPrompt={promptParam || null} />
  );
}

export default PromptsPage;