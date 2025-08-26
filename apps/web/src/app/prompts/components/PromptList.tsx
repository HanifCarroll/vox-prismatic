import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2, Clock, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { dateUtils } from '@/lib/utils';

interface Prompt {
  name: string;
  title: string;
  description: string;
  variables: string[];
  lastModified: string;
}

interface PromptListProps {
  prompts: Prompt[];
  onSelectPrompt: (name: string) => void;
}

export function PromptList({ prompts, onSelectPrompt }: PromptListProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const formatPromptTitle = (name: string): string => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return dateUtils.formatDateTime(date);
  };

  // Get prompt category for visual distinction
  const getPromptCategory = (name: string): { label: string; color: string } => {
    if (name.includes('transcript')) return { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (name.includes('insight')) return { label: 'Analysis', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (name.includes('post')) return { label: 'Generation', color: 'bg-green-50 text-green-700 border-green-200' };
    return { label: 'General', color: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {prompts.map((prompt) => {
        const category = getPromptCategory(prompt.name);
        const variableCount = prompt.variables.length;
        
        return (
          <Card 
            key={prompt.name} 
            className="group relative overflow-hidden border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col"
            onClick={() => onSelectPrompt(prompt.name)}
          >
            {/* Category Badge */}
            <div className="absolute top-4 right-4 z-10">
              <Badge className={`${category.color} border font-medium`}>
                {category.label}
              </Badge>
            </div>
            
            <CardHeader className="pb-3">
              <CardTitle className="text-lg pr-20 leading-tight">
                {prompt.title || formatPromptTitle(prompt.name)}
              </CardTitle>
              <CardDescription className="line-clamp-3 mt-2 text-sm">
                {prompt.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col justify-between">
              {/* Variables Section - Simplified */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Code2 className="h-4 w-4" />
                  <span className="font-medium">
                    {variableCount} {variableCount === 1 ? 'variable' : 'variables'}
                  </span>
                </div>
                
                {/* Show variable names on hover only */}
                <div className="h-6">
                  {variableCount > 0 && (
                    <p className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {prompt.variables.slice(0, 4).join(', ')}
                      {prompt.variables.length > 4 && `, +${prompt.variables.length - 4} more`}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Footer with timestamp */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{mounted ? formatDate(prompt.lastModified) : dateUtils.formatCompact(new Date())}</span>
                </div>
                
                {/* Visual indicator for clickable card */}
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}