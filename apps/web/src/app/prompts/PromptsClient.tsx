'use client';

import { useState } from 'react';
import { PromptList } from './components/PromptList';
import { PromptEditor } from './components/PromptEditor';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Prompt } from './page';

interface PromptsClientProps {
  prompts: Prompt[];
}

export function PromptsClient({ prompts }: PromptsClientProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePromptSelect = (promptName: string) => {
    setSelectedPrompt(promptName);
  };

  const handlePromptUpdate = () => {
    // Since we're server-side rendered, we need to refresh the page
    // to get updated data. In a more sophisticated setup, we could
    // use router.refresh() or revalidation
    window.location.reload();
  };

  const handleBackToList = () => {
    setSelectedPrompt(null);
  };

  const filteredPrompts = prompts.filter(prompt => 
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedPrompt) {
    return (
      <PromptEditor
        promptName={selectedPrompt}
        onBack={handleBackToList}
        onUpdate={handlePromptUpdate}
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Prompt Templates</h1>
        <p className="text-gray-600">
          Manage and customize AI prompt templates used throughout the content pipeline
        </p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <PromptList
        prompts={filteredPrompts}
        onSelectPrompt={handlePromptSelect}
      />
    </div>
  );
}