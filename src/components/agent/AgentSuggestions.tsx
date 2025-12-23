/**
 * AgentSuggestions - Comet/Atlas/Genspark-style suggestions component
 * Provides proactive suggestions based on context
 */

import { useState } from 'react';
import { Sparkles, Lightbulb, Zap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AgentSuggestion {
  id: string;
  text: string;
  category: 'follow-up' | 'action' | 'related' | 'quick';
  icon?: 'sparkles' | 'lightbulb' | 'zap';
}

interface AgentSuggestionsProps {
  suggestions: AgentSuggestion[];
  onSelect: (suggestion: AgentSuggestion) => void;
  isLoading?: boolean;
  title?: string;
}

export function AgentSuggestions({
  suggestions,
  onSelect,
  isLoading = false,
  title = 'Suggestions',
}: AgentSuggestionsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const getIcon = (icon?: string) => {
    switch (icon) {
      case 'lightbulb':
        return <Lightbulb size={16} />;
      case 'zap':
        return <Zap size={16} />;
      case 'sparkles':
      default:
        return <Sparkles size={16} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'follow-up':
        return 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-100';
      case 'action':
        return 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-100';
      case 'related':
        return 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100';
      case 'quick':
      default:
        return 'border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20 text-slate-100';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {suggestions.map((suggestion, idx) => (
            <motion.button
              key={suggestion.id}
              type="button"
              onClick={() => !isLoading && onSelect(suggestion)}
              onMouseEnter={() => setHoveredId(suggestion.id)}
              onMouseLeave={() => setHoveredId(null)}
              disabled={isLoading}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: idx * 0.05 }}
              className={`group w-full rounded-xl border p-3 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${getCategoryColor(
                suggestion.category
              )}`}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-2">
                  <span className="mt-0.5 text-current opacity-70">{getIcon(suggestion.icon)}</span>
                  <span className="flex-1 leading-relaxed">{suggestion.text}</span>
                </div>
                <ArrowRight
                  size={16}
                  className={`text-current opacity-50 transition-all ${
                    hoveredId === suggestion.id ? 'translate-x-1 opacity-100' : ''
                  }`}
                />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Generate suggestions based on query and context
 */
export function generateAgentSuggestions(
  query: string,
  lastResponse?: string,
  context?: { mode?: string; url?: string }
): AgentSuggestion[] {
  const suggestions: AgentSuggestion[] = [];

  // Follow-up questions based on query
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('explain') || lowerQuery.includes('what is')) {
    suggestions.push({
      id: 'suggest-1',
      text: 'Tell me more about this topic',
      category: 'follow-up',
      icon: 'sparkles',
    });
    suggestions.push({
      id: 'suggest-2',
      text: 'What are the main points?',
      category: 'follow-up',
      icon: 'sparkles',
    });
  }

  if (lowerQuery.includes('how') || lowerQuery.includes('step')) {
    suggestions.push({
      id: 'suggest-3',
      text: 'Show me examples',
      category: 'action',
      icon: 'zap',
    });
    suggestions.push({
      id: 'suggest-4',
      text: 'What are the requirements?',
      category: 'follow-up',
      icon: 'lightbulb',
    });
  }

  // Quick actions
  suggestions.push({
    id: 'suggest-5',
    text: 'Summarize in bullet points',
    category: 'quick',
    icon: 'zap',
  });

  if (context?.url) {
    suggestions.push({
      id: 'suggest-6',
      text: 'Analyze this page',
      category: 'action',
      icon: 'sparkles',
    });
  }

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'suggest-default-1',
      text: 'Can you elaborate?',
      category: 'follow-up',
      icon: 'sparkles',
    });
    suggestions.push({
      id: 'suggest-default-2',
      text: 'Give me examples',
      category: 'action',
      icon: 'zap',
    });
  }

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}
