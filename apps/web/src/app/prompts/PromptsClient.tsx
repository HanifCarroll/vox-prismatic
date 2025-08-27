'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PromptList } from './components/PromptList';
import { PromptModal } from './components/PromptModal';
import { PageHeader } from '@/components/PageHeader';
import { Search, X, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Prompt } from './page';

interface PromptsClientProps {
  prompts: Prompt[];
  initialPrompt?: string | null;
}

export function PromptsClient({ prompts, initialPrompt }: PromptsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Get the selected prompt from URL params
  const selectedPrompt = searchParams.get('prompt');

  const handlePromptSelect = (promptName: string) => {
    // Update URL to include the prompt query param
    const params = new URLSearchParams(searchParams);
    params.set('prompt', promptName);
    router.push(`/prompts?${params.toString()}`);
  };

  const handlePromptClose = () => {
    // Remove the prompt query param to close the modal
    const params = new URLSearchParams(searchParams);
    params.delete('prompt');
    const queryString = params.toString();
    router.push(queryString ? `/prompts?${queryString}` : '/prompts');
  };

  const handlePromptUpdate = () => {
    // Since we're server-side rendered, we need to refresh the page
    // to get updated data. In a more sophisticated setup, we could
    // use router.refresh() or revalidation
    window.location.reload();
  };

  const filteredPrompts = prompts.filter(prompt => 
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-gray-50">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Page Header with consistent styling */}
        <PageHeader
          title="Prompt Templates"
          description="Manage and customize AI prompt templates used throughout the content pipeline"
        />

        {/* Main content card with consistent styling */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Search section */}
          <div className="p-6 border-b border-gray-100">
            <div className="relative max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg shadow-sm text-sm placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            {/* Results count when searching */}
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Found {filteredPrompts.length} {filteredPrompts.length === 1 ? 'template' : 'templates'}
              </p>
            )}
          </div>

          {/* Content section */}
          <div className="p-6">
            <PromptList
              prompts={filteredPrompts}
              onSelectPrompt={handlePromptSelect}
            />
            
            {/* Empty state */}
            {filteredPrompts.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No templates found</h3>
                <p className="text-gray-500">
                  {searchQuery 
                    ? `No templates match "${searchQuery}"`
                    : 'No prompt templates available'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Modal */}
        <PromptModal
          promptName={selectedPrompt}
          isOpen={!!selectedPrompt}
          onClose={handlePromptClose}
          onUpdate={handlePromptUpdate}
        />
      </div>
    </div>
  );
}