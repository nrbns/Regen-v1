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
            await ipc.tabs.create(
              `http://localhost:4000/api/search?q=${encodeURIComponent(value)}`
            );
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
            window.dispatchEvent(
              new CustomEvent('summarize-page', { detail: { tabId: currentTab.id } })
            );
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
        return <Search className="h-4 w-4" />;
      case 'open':
        return <BookOpen className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
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
    <div className="border-t border-gray-700 bg-gray-900 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Suggested Actions</h3>
        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
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
              className="group flex w-full items-center gap-3 rounded-lg bg-gray-800 p-3 text-left transition-colors hover:bg-gray-700"
            >
              <div className="flex-shrink-0 text-purple-400 group-hover:text-purple-300">
                {getActionIcon(action.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{action.label}</p>
                {action.description && (
                  <p className="mt-1 text-xs text-gray-400">{action.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-white" />
            </button>
          ))}
        </div>
      )}

      <button
        onClick={loadSuggestions}
        disabled={isLoading}
        className="mt-3 w-full text-xs text-gray-400 transition-colors hover:text-gray-300 disabled:opacity-50"
      >
        Refresh suggestions
      </button>
    </div>
  );
}
