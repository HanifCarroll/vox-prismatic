import { PromptsClient } from "./PromptsClient";
import { getPrompts, type PromptTemplate } from "@/app/actions/prompts";

export type { PromptTemplate as Prompt };

interface PromptsPageProps {
  searchParams: Promise<{
    prompt?: string;
  }>;
}

async function fetchPrompts(): Promise<PromptTemplate[]> {
  try {
    // Use server action to fetch prompts
    const response = await getPrompts();

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
