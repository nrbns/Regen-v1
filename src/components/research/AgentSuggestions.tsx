/**
 * Agent Suggestions - Real-time 3 next actions
 */

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Search, BookOpen, Clock } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { SessionWorkspace } from '../../core/workspace/SessionWorkspace';
import { ipc } from '../../lib/ipc-typed';

interface AgentAction {
  type: 'search' | 'open' | 'reminder' | 'note' | 'summarize';
  label: string;
  command: string;
  description?: string;
}

export function AgentSuggestions() {
  const { tabs, activeId } = useTabsStore();
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentTab = tabs.find(t => t.id === activeId);

  useEffect(() => {
    if (currentTab) {
      loadSuggestions();
    }
  }, [currentTab?.url]);

  const loadSuggestions = async () => {
    if (!currentTab) return;

    setIsLoading(true);
    try {
      const session = SessionWorkspace.getCurrentSession();
      const sessionHistory = session
        ? {
            tabs: session.tabs.length,
            notes: session.notes.length,
            summaries: session.summaries.length,
          }
        : null;

      const response = await fetch('http://localhost:4000/api/ai/suggest-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUrl: currentTab.url,
          query: session?.metadata.query || currentTab.title,
          sessionHistory,
          openTabs: tabs.map(t => t.url).slice(0, 10),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error('[AgentSuggestions] Failed:', error);
      // Fallback actions
      setActions([
        {
          type: 'search',
          label: 'Search related topics',
          command: `search:${currentTab?.title || 'related topics'}`,
        },
        {
          type: 'open',
          label: 'Open similar papers',
          command: 'open:similar papers',
        },
        {
          type: 'reminder',
          label: 'Set research reminder',
          command: 'reminder:review this later',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action: AgentAction) => {
    try {
      const [type, ...parts] = action.command.split(':');
      const value = parts.join(':');

      switch (type) {
        case 'search':
          // Open search in new tab
          await ipc.tabs.create(`http://localhost:4000/api/search?q=${encodeURIComponent(value)}`);
          break;

        case 'open':
          // Open URL or search
          if (value.startsWith('http')) {
            await ipc.tabs.create(value);
          } else {
            await ipc.tabs.create(`http://localhost:4000/api/search?q=${encodeURIComponent(value)}`);
          }
          break;

        case 'reminder':
          // Create reminder note
          if (currentTab) {
            SessionWorkspace.addNote({
              content: `Reminder: ${value}`,
              url: currentTab.url,
              tags: ['reminder'],
            });
          }
          break;

        case 'note':
          // Create note
          if (currentTab) {
            SessionWorkspace.addNote({
              content: value,
              url: currentTab.url,
            });
          }
          break;

        case 'summarize':
          // Summarize current page
          if (currentTab) {
            // Trigger summarization
            window.dispatchEvent(new CustomEvent('summarize-page', { detail: { tabId: currentTab.id } }));
          }
          break;
      }

      // Reload suggestions after action
      setTimeout(loadSuggestions, 1000);
    } catch (error) {
      console.error('[AgentSuggestions] Action execution failed:', error);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'search':
        return <Search className="w-4 h-4" />;
      case 'open':
        return <BookOpen className="w-4 h-4" />;
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  if (!currentTab) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p className="text-sm">No active tab</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 border-t border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Suggested Actions</h3>
        {isLoading && (
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {actions.length === 0 && !isLoading ? (
        <p className="text-xs text-gray-400">No suggestions available</p>
      ) : (
        <div className="space-y-2">
          {actions.slice(0, 3).map((action, index) => (
            <button
              key={index}
              onClick={() => executeAction(action)}
              className="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left group"
            >
              <div className="flex-shrink-0 text-purple-400 group-hover:text-purple-300">
                {getActionIcon(action.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{action.label}</p>
                {action.description && (
                  <p className="text-xs text-gray-400 mt-1">{action.description}</p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      <button
        onClick={loadSuggestions}
        disabled={isLoading}
        className="mt-3 w-full text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
      >
        Refresh suggestions
      </button>
    </div>
  );
}

