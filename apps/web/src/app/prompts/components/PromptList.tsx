import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Variable, Clock } from 'lucide-react';

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
  const formatPromptTitle = (name: string): string => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPromptIcon = (name: string): string => {
    const iconMap: Record<string, string> = {
      'clean-transcript': '🧹',
      'extract-insights': '💡',
      'generate-posts': '📝',
      'generate-transcript-title': '📄'
    };
    return iconMap[name] || '📋';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {prompts.map((prompt) => (
        <Card 
          key={prompt.name} 
          className="hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => onSelectPrompt(prompt.name)}
        >
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <span className="text-3xl">{getPromptIcon(prompt.name)}</span>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPrompt(prompt.name);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-xl">
              {prompt.title || formatPromptTitle(prompt.name)}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-2">
              {prompt.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Variable className="h-4 w-4" />
                <span>{prompt.variables.length} variables</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {prompt.variables.slice(0, 3).map((variable) => (
                  <Badge key={variable} variant="secondary" className="text-xs">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
                {prompt.variables.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{prompt.variables.length - 3} more
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                <Clock className="h-3 w-3" />
                <span>Modified: {formatDate(prompt.lastModified)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}