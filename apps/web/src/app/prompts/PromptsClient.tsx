
import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PromptList } from "./components/PromptList";
import { PromptModal } from "./components/PromptModal";
import { PageHeader } from "@/components/PageHeader";
import { Search, X, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Prompt } from "./page";

interface PromptsClientProps {
  prompts: Prompt[];
  initialPrompt?: string | null;
}

export function PromptsClient({ prompts, initialPrompt }: PromptsClientProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(
    initialPrompt ?? null
  );

  // Sync local state from the current URL (supports back/forward navigation)
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    setSelectedPrompt(promptParam);
  }, [searchParams]);

  const handlePromptSelect = (promptName: string) => {
    // Open modal immediately and update URL without navigation
    setSelectedPrompt(promptName);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set("prompt", promptName);
      return newParams;
    });
  };

  const handlePromptClose = () => {
    // Close modal and update URL without navigation
    setSelectedPrompt(null);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete("prompt");
      return newParams;
    });
  };

  const handlePromptUpdate = () => {
    // Use React Query to refetch the prompts data
    startTransition(() => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    });
  };

  const filteredPrompts = prompts.filter(
    (prompt) =>
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
        <div className={`bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
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
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Results count when searching */}
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Found {filteredPrompts.length}{" "}
                {filteredPrompts.length === 1 ? "template" : "templates"}
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
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No templates found
                </h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? `No templates match "${searchQuery}"`
                    : "No prompt templates available"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Modal - Pass full prompt data including content */}
        <PromptModal
          promptName={selectedPrompt}
          promptData={
            selectedPrompt
              ? prompts.find((p) => p.name === selectedPrompt) || null
              : null
          }
          isOpen={!!selectedPrompt}
          onClose={handlePromptClose}
          onUpdate={handlePromptUpdate}
        />
      </div>
    </div>
  );
}
