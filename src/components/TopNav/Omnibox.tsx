/**
 * Omnibox - URL bar with autocomplete suggestions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Lock, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { TabUpdate } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { debounce } from 'lodash-es';

interface Suggestion {
  type: 'history' | 'tab' | 'command';
  title: string;
  url?: string;
  icon?: string;
}

export function Omnibox({ onCommandPalette }: { onCommandPalette: () => void }) {
  const { tabs, activeId } = useTabsStore();
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [siteInfo, setSiteInfo] = useState<{ secure: boolean; shieldCount?: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeId);

  // Listen for tab updates
  useIPCEvent<TabUpdate[]>('tabs:updated', (tabs) => {
    const tab = tabs.find(t => t.active);
    if (tab) {
      setUrl(tab.url || '');
      try {
        const urlObj = new URL(tab.url);
        setSiteInfo({
          secure: urlObj.protocol === 'https:',
        });
      } catch {}
    }
  }, [activeId]);

  // Listen for progress updates
  useIPCEvent<{ tabId: string; progress: number }>('tabs:progress', (data) => {
    if (data.tabId === activeId) {
      setProgress(data.progress);
      setIsLoading(data.progress < 100);
    }
  }, [activeId]);

  // Debounced search suggestions
  const searchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      const results: Suggestion[] = [];

      // Commands
      if (query.startsWith('?') || query.toLowerCase().startsWith('ask ')) {
        results.push({
          type: 'command',
          title: `Ask Agent: ${query.startsWith('?') ? query.slice(1) : query.slice(4)}`,
        });
      }
      if (query.startsWith('/')) {
        results.push({
          type: 'command',
          title: `Run Command: ${query.slice(1)}`,
        });
      }

      // Tab matches
      tabs.forEach(tab => {
        const title = tab.title || 'Untitled';
        const url = tab.url || '';
        if (title.toLowerCase().includes(query.toLowerCase()) ||
            url.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            type: 'tab',
            title,
            url: url || undefined,
          });
        }
      });

      // History (would fetch from IPC)
      try {
        // const history = await ipc.history.search(query);
        // history.slice(0, 3).forEach(item => {
        //   results.push({
        //     type: 'history',
        //     title: item.title,
        //     url: item.url,
        //   });
        // });
      } catch {}

      setSuggestions(results.slice(0, 8));
    }, 150),
    [tabs]
  );

  useEffect(() => {
    if (focused && url) {
      searchSuggestions(url);
    } else {
      setSuggestions([]);
    }
  }, [url, focused, searchSuggestions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCommandPalette]);

  const handleNavigate = async (targetUrl: string) => {
    if (!activeId) return;

    // Agent query
    if (targetUrl.startsWith('?') || targetUrl.toLowerCase().startsWith('ask ')) {
      const query = targetUrl.startsWith('?') ? targetUrl.slice(1).trim() : targetUrl.slice(4).trim();
                  try {
                    const tabUrl = activeTab?.url;
                    const response = await ipc.agent.ask(query, tabUrl ? { url: tabUrl } : undefined);
                    alert(`Agent: ${response.answer}`);
                  } catch (error: any) {
                    alert(`Agent error: ${error.message || 'Unknown error'}`);
                  }
      return;
    }

    // Normalize URL
    let finalUrl = targetUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        finalUrl = `https://${targetUrl}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
      }
    }

    try {
      await ipc.tabs.navigate(activeId, finalUrl);
      setFocused(false);
      setSuggestions([]);
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        const suggestion = suggestions[selectedIndex];
        if (suggestion.url) {
          await handleNavigate(suggestion.url);
        } else {
          await handleNavigate(url);
        }
      } else {
        await handleNavigate(url);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setFocused(false);
      setSuggestions([]);
    }
  };

  return (
    <div className="relative flex-1 max-w-2xl">
      <motion.div
        className="relative"
        animate={{ scale: focused ? 1.02 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative flex items-center">
          {/* Site Info Icons */}
          {siteInfo && url && !focused && (
            <div className="absolute left-3 flex items-center gap-2 z-10">
              {siteInfo.secure ? (
                <Lock size={14} className="text-green-400" />
              ) : (
                <AlertCircle size={14} className="text-amber-400" />
              )}
              {siteInfo.shieldCount !== undefined && siteInfo.shieldCount > 0 && (
                <div className="flex items-center gap-1">
                  <Shield size={14} className="text-blue-400" />
                  <span className="text-xs text-gray-400">{siteInfo.shieldCount}</span>
                </div>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)} // Delay for suggestion clicks
            onKeyDown={handleKeyDown}
            placeholder="Search, enter URL, or ? Ask Agent (⌘L to focus, ⌘K for commands)"
            className={`
              w-full h-9 px-4 ${siteInfo && !focused ? 'pl-20' : 'pl-4'} pr-10
              bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl
              text-sm text-gray-200 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
              hover:bg-gray-800/80 transition-all
            `}
          />

          {/* Progress Bar */}
          {isLoading && progress > 0 && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-b-xl"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.1 }}
            />
          )}

          {/* Search Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline px-1.5 py-0.5 bg-gray-900/50 rounded border border-gray-700/50 text-xs text-gray-500">⌘K</kbd>
          </div>
        </div>
      </motion.div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden z-50"
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  if (suggestion.url) {
                    handleNavigate(suggestion.url);
                  } else {
                    handleNavigate(url);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left
                  transition-colors
                  ${selectedIndex === index
                    ? 'bg-gray-800/60 text-gray-100'
                    : 'text-gray-300 hover:bg-gray-800/40'
                  }
                `}
              >
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {suggestion.type === 'command' && <Search size={14} className="text-blue-400" />}
                  {suggestion.type === 'tab' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                  {suggestion.type === 'history' && <div className="w-3 h-3 bg-gray-500 rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{suggestion.title}</div>
                  {suggestion.url && (
                    <div className="text-xs text-gray-500 truncate">{suggestion.url}</div>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

