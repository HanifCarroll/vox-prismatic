'use client';

import { useState, useEffect } from 'react';
import { PromptList } from './components/PromptList';
import { PromptEditor } from './components/PromptEditor';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Prompt {
  name: string;
  title: string;
  description: string;
  variables: string[];
  lastModified: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const result = await response.json();
      if (result.success) {
        setPrompts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (promptName: string) => {
    setSelectedPrompt(promptName);
  };

  const handlePromptUpdate = () => {
    fetchPrompts();
    setSelectedPrompt(null);
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading prompts...</div>
        </div>
      ) : (
        <PromptList
          prompts={filteredPrompts}
          onSelectPrompt={handlePromptSelect}
        />
      )}
    </div>
  );
}