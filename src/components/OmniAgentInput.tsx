/**
 * OmniAgent Input - Tier 2
 * "Ask OmniAgent" input in Research Mode
 */

import { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { runAgent, type AgentTask } from '../agent/runAgent';
import { executeAgentGoal } from '../core/agent/integration';
import { toast } from '../utils/toast';
import { validateUrlForAgent } from '../core/security/urlSafety';

interface OmniAgentInputProps {
  currentUrl?: string;
  onResult?: (result: {
    type: string;
    content: string;
    sources?: Array<{ url: string; title: string }>;
  }) => void;
}

export function OmniAgentInput({ currentUrl, onResult }: OmniAgentInputProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      // Tier 3: Use new agent planner for complex goals
      let result;

      // Check if it's a complex multi-step goal
      const isComplexGoal =
        query.toLowerCase().includes('research') &&
        (query.toLowerCase().includes('compare') ||
          query.toLowerCase().includes('save') ||
          query.toLowerCase().includes('workspace'));

      if (isComplexGoal) {
        // Use new agent graph system
        result = await executeAgentGoal(query);
        onResult?.({
          type: 'complex_plan',
          content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          sources: [],
        });
      } else {
        // Use simple agent for quick tasks
        let task: AgentTask;

        if (
          currentUrl &&
          (query.toLowerCase().includes('explain') || query.toLowerCase().includes('this page'))
        ) {
          const validation = validateUrlForAgent(currentUrl);
          if (!validation.safe) {
            toast.error(validation.reason || 'Unsafe URL');
            setLoading(false);
            return;
          }
          task = { type: 'explain_page', url: currentUrl };
        } else if (query.toLowerCase().includes('compare') && query.includes('http')) {
          const urlMatches = query.match(/https?:\/\/[^\s]+/g) || [];
          if (urlMatches.length >= 2) {
            const validation = urlMatches.every(url => validateUrlForAgent(url).safe);
            if (!validation) {
              toast.error('One or more URLs are unsafe');
              setLoading(false);
              return;
            }
            task = { type: 'compare_urls', urls: urlMatches };
          } else {
            task = { type: 'deep_research', topic: query };
          }
        } else if (query.toLowerCase().includes('research') || query.length > 50) {
          task = { type: 'deep_research', topic: query };
        } else if (currentUrl) {
          const validation = validateUrlForAgent(currentUrl);
          if (!validation.safe) {
            toast.error(validation.reason || 'Unsafe URL');
            setLoading(false);
            return;
          }
          task = { type: 'quick_summary', url: currentUrl };
        } else {
          task = { type: 'deep_research', topic: query };
        }

        result = await runAgent(task);
        onResult?.(result);
      }

      toast.success('OmniAgent completed!');
    } catch (error) {
      console.error('OmniAgent error', error);
      toast.error(error instanceof Error ? error.message : 'OmniAgent failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-800 p-4 bg-slate-900/50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Sparkles size={14} />
          <span>Ask OmniAgent</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              currentUrl
                ? 'Explain this page, research a topic, or compare URLs...'
                : 'Research a topic, compare URLs, or ask a question...'
            }
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Processing...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span className="text-xs">Ask</span>
              </>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Examples: "Explain this page", "Research benefits of intermittent fasting", "Compare
          https://example.com and https://example.org"
        </div>
      </form>
    </div>
  );
}
