import { apiClient } from "@/lib/api-client";
import { PromptsClient } from "./PromptsClient";
import type { PromptTemplate } from "./hooks/usePromptQueries";

export type { PromptTemplate as Prompt };

interface PromptsPageProps {
  searchParams: Promise<{
    prompt?: string;
  }>;
}

async function fetchPrompts(): Promise<PromptTemplate[]> {
  try {
    // Fetch all prompts with content from the API server
    const response = await apiClient.get<PromptTemplate[]>("/api/prompts");
    console.log("response", response);

    if (!response.success) {
      console.error("Failed to fetch prompts:", response.error);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch prompts from API:", error);
    return [];
  }
}

export default async function PromptsPage({ searchParams }: PromptsPageProps) {
  const prompts = await fetchPrompts();
  const params = await searchParams;

  return (
    <PromptsClient prompts={prompts} initialPrompt={params?.prompt || null} />
  );
}
