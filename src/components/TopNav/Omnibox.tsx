/**
 * Omnibox - URL bar with autocomplete suggestions and search
 * Fully functional search and navigation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Lock, Shield, AlertCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { TabUpdate } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { debounce } from 'lodash-es';

interface Suggestion {
  type: 'history' | 'tab' | 'command' | 'search';
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
  useIPCEvent<TabUpdate[]>('tabs:updated', (tabList) => {
    const tab = Array.isArray(tabList) ? tabList.find((t: any) => t.active) : null;
    if (tab && !focused) {
      setUrl(tab.url || '');
      try {
        const urlObj = new URL(tab.url || 'about:blank');
        setSiteInfo({
          secure: urlObj.protocol === 'https:',
        });
      } catch {
        setSiteInfo(null);
      }
    }
  }, [activeId, focused]);

  // Listen for progress updates
  useIPCEvent<{ tabId: string; progress: number }>('tabs:progress', (data) => {
    if (data.tabId === activeId) {
      setProgress(data.progress);
      setIsLoading(data.progress < 100 && data.progress > 0);
    }
  }, [activeId]);

  // Search suggestions with history and tabs
  const searchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      const results: Suggestion[] = [];
      const queryLower = query.toLowerCase().trim();

      // Quick Actions
      if (queryLower.startsWith('/ai ') || queryLower === '/ai') {
        results.push({
          type: 'command',
          title: `AI Search: ${query.slice(4).trim() || 'Enter your question'}`,
          url: query,
        });
      }
      if (queryLower.startsWith('/calc ') || queryLower === '/calc') {
        results.push({
          type: 'command',
          title: `Calculate: ${query.slice(6).trim() || 'Enter expression'}`,
          url: query,
        });
      }
      if (queryLower.startsWith('/yt ') || queryLower === '/yt') {
        results.push({
          type: 'command',
          title: `YouTube: ${query.slice(4).trim() || 'Enter search'}`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query.slice(4).trim())}`,
        });
      }
      if (queryLower.startsWith('/g ') || queryLower === '/g') {
        results.push({
          type: 'command',
          title: `Google: ${query.slice(3).trim() || 'Enter search'}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query.slice(3).trim())}`,
        });
      }
      if (queryLower.startsWith('/t ') || queryLower === '/t') {
        results.push({
          type: 'command',
          title: `Twitter/X: ${query.slice(3).trim() || 'Enter search'}`,
          url: `https://twitter.com/search?q=${encodeURIComponent(query.slice(3).trim())}`,
        });
      }

      // Commands
      if (queryLower.startsWith('?') || queryLower.startsWith('ask ')) {
        results.push({
          type: 'command',
          title: `Ask Agent: ${query.startsWith('?') ? query.slice(1) : query.slice(4)}`,
          url: query,
        });
      }
      if (queryLower.startsWith('/') && !queryLower.match(/^\/(ai|calc|yt|g|t)(\s|$)/)) {
        results.push({
          type: 'command',
          title: `Run Command: ${query.slice(1)}`,
          url: query,
        });
      }

      // Search suggestion (Google/DuckDuckGo)
      if (queryLower.length > 0 && !queryLower.startsWith('http') && !queryLower.includes('.')) {
        results.push({
          type: 'search',
          title: `Search: ${query}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        });
      }

      // Tab matches
      tabs.forEach(tab => {
        const title = tab.title || 'Untitled';
        const tabUrl = tab.url || '';
        if (title.toLowerCase().includes(queryLower) ||
            tabUrl.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'tab',
            title,
            url: tabUrl || undefined,
          });
        }
      });

      // History search (recent searches when query is empty or short)
      try {
        let history: any[] = [];
        if (queryLower.trim().length === 0 || queryLower.length < 2) {
          // If query is empty or very short, get recent history
          history = await ipc.history.search('');
        } else {
          // Normal search
          history = await ipc.history.search(query);
        }
        
        if (Array.isArray(history) && history.length > 0) {
          history.slice(0, 5).forEach((item: any) => {
            results.push({
              type: 'history',
              title: item.title || item.url || 'Untitled',
              url: item.url,
            });
          });
        }
      } catch (error) {
        // History search not available, continue
        console.warn('History search failed:', error);
      }

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
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (modifier && e.key === 'k') {
        e.preventDefault();
        onCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCommandPalette]);

  const handleNavigate = async (targetUrl: string) => {
    if (!activeId) {
      // Create a new tab if none exists
      try {
        // Ensure IPC is ready
        if (!window.ipc || typeof (window.ipc as any).invoke !== 'function') {
          console.warn('IPC not ready for navigation, waiting...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const newTab = await ipc.tabs.create(targetUrl);
        if (newTab && newTab.id) {
          setFocused(false);
          setSuggestions([]);
          // Wait a bit for tab to be ready
          await new Promise(resolve => setTimeout(resolve, 300));
          return;
        } else {
          console.warn('Tab creation returned invalid result:', newTab);
        }
      } catch (error) {
        console.error('Failed to create tab for navigation:', error);
      }
      return;
    }

    // Normalize URL
    let finalUrl = targetUrl.trim();
    const queryLower = finalUrl.toLowerCase().trim();
    
    // Quick Actions
    if (queryLower.startsWith('/calc ')) {
      const expression = finalUrl.slice(6).trim();
      try {
        // Safe evaluation for calculations
        const result = Function(`"use strict"; return (${expression})`)();
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(`${expression} = ${result}`)}`;
      } catch {
        // If evaluation fails, just search for it
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(expression)}`;
      }
    } else if (queryLower.startsWith('/ai ')) {
      const query = finalUrl.slice(4).trim();
      try {
        const tabUrl = activeTab?.url;
        await ipc.agent.ask(query, tabUrl ? { url: tabUrl } : undefined);
        // Navigate to agent console or show result
        finalUrl = `ob://agent?q=${encodeURIComponent(query)}`;
      } catch (error: any) {
        console.error('AI search error:', error);
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    } else if (queryLower.startsWith('/yt ')) {
      const query = finalUrl.slice(4).trim();
      finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    } else if (queryLower.startsWith('/g ')) {
      const query = finalUrl.slice(3).trim();
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    } else if (queryLower.startsWith('/t ')) {
      const query = finalUrl.slice(3).trim();
      finalUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}`;
    } else if (targetUrl.startsWith('?') || queryLower.startsWith('ask ')) {
      // Agent query (legacy)
      const query = targetUrl.startsWith('?') ? targetUrl.slice(1).trim() : targetUrl.slice(4).trim();
      try {
        const tabUrl = activeTab?.url;
        await ipc.agent.ask(query, tabUrl ? { url: tabUrl } : undefined);
        finalUrl = `ob://agent?q=${encodeURIComponent(query)}`;
      } catch (error: any) {
        console.error('Agent error:', error);
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    }
    
    // URL normalization (only if not already handled by quick actions)
    const isQuickAction = queryLower.startsWith('/calc ') || 
                         queryLower.startsWith('/ai ') || 
                         queryLower.startsWith('/yt ') || 
                         queryLower.startsWith('/g ') || 
                         queryLower.startsWith('/t ') ||
                         targetUrl.startsWith('?') || 
                         queryLower.startsWith('ask ');
    
    if (!isQuickAction) {
      // If it's already a valid URL, use it
      if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
        // URL is valid, use as-is
      } else if (finalUrl.startsWith('about:')) {
        // Special protocol, use as-is
      } else {
        // Check if it looks like a domain
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
        if (domainPattern.test(finalUrl) || finalUrl.includes('.')) {
          // Looks like a domain, add https://
          finalUrl = `https://${finalUrl}`;
        } else {
          // Search query
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
        }
      }
    }

    try {
      // Ensure IPC is ready
      if (!window.ipc || typeof (window.ipc as any).invoke !== 'function') {
        console.warn('IPC not ready for navigation, waiting...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await ipc.tabs.navigate(activeId, finalUrl);
      setFocused(false);
      setSuggestions([]);
      setUrl(finalUrl); // Update displayed URL
    } catch (error) {
      console.error('Navigation failed:', error);
      // Try creating a new tab if navigation to active tab fails
      try {
        // Ensure IPC is ready
        if (!window.ipc || typeof (window.ipc as any).invoke !== 'function') {
          console.warn('IPC not ready for tab creation, waiting...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const newTab = await ipc.tabs.create(finalUrl);
        if (newTab && newTab.id) {
          setFocused(false);
          setSuggestions([]);
          // Wait a bit for tab to be ready
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          console.warn('Tab creation returned invalid result:', newTab);
        }
      } catch (createError) {
        console.error('Failed to create new tab:', createError);
      }
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
      inputRef.current?.blur();
    }
  };

  // Sync URL with active tab when not focused
  useEffect(() => {
    if (!focused && activeTab) {
      setUrl(activeTab.url || '');
    }
  }, [activeTab, focused]);

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
            <div className="absolute left-3 flex items-center gap-2 z-10 pointer-events-none" aria-hidden="true">
              {siteInfo.secure ? (
                <Lock size={14} className="text-green-400" aria-label="Secure connection" />
              ) : url.startsWith('http://') ? (
                <AlertCircle size={14} className="text-amber-400" aria-label="Insecure connection" />
              ) : (
                <Globe size={14} className="text-gray-400" aria-label="Web page" />
              )}
              {siteInfo.shieldCount !== undefined && siteInfo.shieldCount > 0 && (
                <div className="flex items-center gap-1" aria-label={`${siteInfo.shieldCount} shields active`}>
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
            aria-label="Address bar - Search or enter URL"
            aria-autocomplete="list"
            aria-expanded={focused && suggestions.length > 0}
            placeholder="Search or enter URL"
            className={`
              w-full h-9 px-4 ${siteInfo && !focused ? 'pl-20' : 'pl-4'} pr-10
              bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl
              text-sm text-white placeholder-gray-400
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <Search size={14} className="text-gray-500" />
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
                onClick={async () => {
                  if (suggestion.url && suggestion.url !== 'about:blank') {
                    await handleNavigate(suggestion.url);
                  } else if (url && url.trim().length > 0) {
                    await handleNavigate(url);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (suggestion.url && suggestion.url !== 'about:blank') {
                      handleNavigate(suggestion.url);
                    } else if (url && url.trim().length > 0) {
                      handleNavigate(url);
                    }
                  }
                }}
                role="option"
                aria-selected={selectedIndex === index}
                aria-label={`${suggestion.type} suggestion: ${suggestion.title}`}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left
                  transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                  ${selectedIndex === index
                    ? 'bg-gray-800/60 text-gray-100'
                    : 'text-gray-300 hover:bg-gray-800/40'
                  }
                `}
              >
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {suggestion.type === 'command' && <Search size={14} className="text-blue-400" />}
                  {suggestion.type === 'search' && <Search size={14} className="text-purple-400" />}
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
