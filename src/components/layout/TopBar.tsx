/**
 * Top Bar - Address + Command + Visual Feedback
 * 
 * Rules:
 * - URL + Search + Command in ONE box
 * - Typing does nothing automatically
 * - Pressing Enter: URL → navigate, Command → create task
 * - Visual feedback badges (Navigate / Command / Explain)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Sparkles, Navigation, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '../../state/tabsStore';
import { emitCommand } from '../../core/regen-v1/integrationHelpers';
import { createTask, executeTask } from '../../core/execution/taskManager';

type InputMode = 'url' | 'search' | 'command' | null;

interface TopBarProps {
  className?: string;
}

export function TopBar({ className = '' }: TopBarProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InputMode>(null);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const { activeTabId, tabs } = useTabsStore();

  // Detect mode based on input
  useEffect(() => {
    if (!input.trim()) {
      setMode(null);
      return;
    }

    const trimmed = input.trim();

    // URL detection (starts with http://, https://, or looks like domain)
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('file://') ||
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) ||
      trimmed === 'localhost' ||
      trimmed.startsWith('localhost:')
    ) {
      setMode('url');
      return;
    }

    // Command detection (starts with /, :, or common command words)
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith(':') ||
      /^(explain|summarize|search|find|fetch|analyze|save|close|open)/i.test(trimmed)
    ) {
      setMode('command');
      return;
    }

    // Default to search
    setMode('search');
  }, [input]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const trimmed = input.trim();

      if (mode === 'url') {
        // Navigate to URL
        let url = trimmed;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
          url = `https://${url}`;
        }

        if (activeTabId) {
          // Update active tab
          const { updateTab } = useTabsStore.getState();
          updateTab(activeTabId, { url });
        } else {
          // Create new tab
          const { createTab } = useTabsStore.getState();
          createTab(url);
        }
        setInput('');
        setMode(null);
        return;
      }

      if (mode === 'command') {
        // Create task and execute command
        const command = trimmed.startsWith('/') || trimmed.startsWith(':')
          ? trimmed.slice(1)
          : trimmed;

        const task = createTask('command', { command });
        
        try {
          await executeTask(task.id, async (taskParam, signal) => {
            if (signal.aborted) throw new Error('Cancelled');

            // Lazy load CommandController
            const { commandController } = await import('../../lib/command/CommandController');
            
            const result = await commandController.handleCommand(command, {
              currentUrl: window.location.href,
              activeTab: activeTabId,
            });

            if (signal.aborted) throw new Error('Cancelled');
          });
        } catch (error) {
          console.error('[TopBar] Command failed:', error);
        }

        setInput('');
        setMode(null);
        return;
      }

      // Default: search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
      if (activeTabId) {
        const { updateTab } = useTabsStore.getState();
        updateTab(activeTabId, { url: searchUrl });
      } else {
        const { createTab } = useTabsStore.getState();
        createTab(searchUrl);
      }
      setInput('');
      setMode(null);
    },
    [input, mode, activeTabId]
  );

  const getModeBadge = () => {
    if (!mode || !isFocused) return null;

    const badges = {
      url: { icon: Navigation, text: 'Navigate', color: 'bg-blue-500' },
      search: { icon: Search, text: 'Search', color: 'bg-green-500' },
      command: { icon: Sparkles, text: 'Command', color: 'bg-purple-500' },
    };

    const badge = badges[mode];
    const Icon = badge.icon;

    return (
      <div className={`${badge.color} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        <span>{badge.text}</span>
      </div>
    );
  };

  return (
    <div className={`h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 ${className}`}>
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow badge click
            placeholder={mode === 'command' ? 'Enter command...' : mode === 'url' ? 'Enter URL...' : 'Search or enter URL...'}
            className="w-full h-9 px-3 pr-20 bg-slate-900 border border-slate-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {getModeBadge()}
          </div>
        </div>
        <button
          type="submit"
          className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
