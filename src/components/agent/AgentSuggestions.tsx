import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';

export interface AgentSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
}

export function generateAgentSuggestions(): AgentSuggestion[] {
  return [
    {
      id: '1',
      title: 'Analyze Current Page',
      description: 'Extract key information from the current web page',
      action: 'analyze',
    },
    {
      id: '2',
      title: 'Generate Summary',
      description: 'Create a concise summary of the page content',
      action: 'summarize',
    },
    {
      id: '3',
      title: 'Find Related Content',
      description: 'Discover similar articles and resources',
      action: 'related',
    },
  ];
}

interface AgentSuggestionsProps {
  suggestions?: AgentSuggestion[];
  onSuggestionClick?: (suggestion: AgentSuggestion) => void;
}

export function AgentSuggestions({ suggestions = generateAgentSuggestions(), onSuggestionClick }: AgentSuggestionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Lightbulb className="h-5 w-5 text-yellow-400" />
        <h3 className="text-sm font-medium text-slate-200">Suggestions</h3>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSuggestionClick?.(suggestion)}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-slate-200 mb-1">{suggestion.title}</h4>
                <p className="text-xs text-slate-400">{suggestion.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400 transition-colors flex-shrink-0 ml-2" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}