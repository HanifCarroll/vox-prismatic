import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getAvailableTemplates } from '@content-creation/prompts';
import { PromptsClient } from './PromptsClient';

export interface Prompt {
  name: string;
  title: string;
  description: string;
  variables: string[];
  lastModified: string;
}

async function fetchPrompts(): Promise<Prompt[]> {
  try {
    // Get the list of available templates
    const templateNames = getAvailableTemplates();
    
    // Get the templates directory path
    const templatesDir = join(process.cwd(), '../../packages/prompts/templates');
    
    // Build prompt metadata for each template
    const prompts = await Promise.all(
      templateNames.map(async (name) => {
        try {
          const filePath = join(templatesDir, `${name}.md`);
          const stats = await stat(filePath);
          
          // Read the file to extract description and variables
          const { readFileSync } = await import('node:fs');
          const content = readFileSync(filePath, 'utf-8');
          
          // Extract first paragraph as description
          const lines = content.split('\n');
          const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
          const description = firstNonEmptyLine || 'No description available';
          
          // Extract variables
          const variableMatches = content.match(/{{(\w+)}}/g);
          const variables = variableMatches
            ? [...new Set(variableMatches.map(match => match.replace(/[{}]/g, '')))]
            : [];
          
          // Generate a user-friendly title
          const title = name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            name,
            title,
            description: description.substring(0, 200), // Limit description length
            variables,
            lastModified: stats.mtime.toISOString()
          };
        } catch (error) {
          console.error(`Error processing template ${name}:`, error);
          return {
            name,
            title: name,
            description: 'Failed to load description',
            variables: [],
            lastModified: new Date().toISOString()
          };
        }
      })
    );
    
    return prompts;
  } catch (error) {
    console.error('Failed to list prompts:', error);
    return [];
  }
}

export default async function PromptsPage() {
  const prompts = await fetchPrompts();

  return <PromptsClient prompts={prompts} />;
}