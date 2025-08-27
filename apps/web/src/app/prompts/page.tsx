import { fetchPromptTemplates, type PromptTemplate } from '@/lib/prompts/api-client';
import { PromptsClient } from './PromptsClient';

export interface Prompt {
  name: string;
  title: string;
  description: string;
  variables: string[];
  lastModified: string;
}

interface PromptsPageProps {
  searchParams: Promise<{
    prompt?: string;
  }>;
}

async function fetchPrompts(): Promise<Prompt[]> {
  try {
    // Fetch prompts from the API server
    const templates: PromptTemplate[] = await fetchPromptTemplates();
    
    // Convert API response to expected format
    return templates.map(template => ({
      name: template.name,
      title: template.title,
      description: template.description.substring(0, 200), // Limit description length
      variables: template.variables,
      lastModified: template.lastModified
    }));
  } catch (error) {
    console.error('Failed to fetch prompts from API:', error);
    return [];
  }
}

export default async function PromptsPage({ searchParams }: PromptsPageProps) {
  const prompts = await fetchPrompts();
  const params = await searchParams;
  
  return (
    <PromptsClient 
      prompts={prompts}
      initialPrompt={params?.prompt || null}
    />
  );
}