/**
 * Enhanced URL Bar Component
 * URL bar with history, autocomplete, and navigation features
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Globe,
  Clock,
  X,
  ArrowUp,
  Lock,
  AlertTriangle,
  // RefreshCw, // Unused
} from 'lucide-react';
import { useHistoryStore } from '../../state/historyStore';
import { useTabsStore } from '../../state/tabsStore';
// import { normalizeInputToUrlOrSearch } from '../../lib/search'; // Unused
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../mobile';
import { URLBarProgress } from './URLBarProgress';
import { useTabLoadingStore } from '../../state/tabLoadingStore';

export interface EnhancedURLBarProps {
  tabId: string | null;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (url: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean; // SPRINT 0: Page loading state for progress bar
  loadProgress?: number; // SPRINT 0: Load progress (0-100)
}

export function EnhancedURLBar({
  tabId,
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = 'Search or enter URL',
  className,
  isLoading: isLoadingProp = false, // SPRINT 0: Page loading state
  loadProgress: loadProgressProp, // SPRINT 0: Load progress
}: EnhancedURLBarProps) {
  const { isMobile } = useMobileDetection();
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [_historyResults, setHistoryResults] = useState<
    Array<{ id: string; url: string; title: string; timestamp: number }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tab = useTabsStore(state => (tabId ? state.tabs.find(t => t.id === tabId) : null));
  const historyEntries = useHistoryStore(state => state.getRecent(20));
  const { navigateTab } = useTabsStore();

  // SPRINT 0: Get loading state from store
  const tabLoadingState = useTabLoadingStore(state =>
    tabId ? state.getLoading(tabId) : { isLoading: false }
  );

  // Use provided props or fallback to store state
  const finalIsLoading = isLoadingProp !== undefined ? isLoadingProp : tabLoadingState.isLoading;
  const finalLoadProgress =
    loadProgressProp !== undefined ? loadProgressProp : tabLoadingState.progress;

  const displayValue = controlledValue !== undefined ? controlledValue : localValue;
  const currentUrl = tab?.url || '';

  // Update local value when tab URL changes
  useEffect(() => {
    if (controlledValue === undefined) {
      setLocalValue(currentUrl);
    }
  }, [currentUrl, controlledValue]);

  // Filter history based on input
  const filteredHistory = useMemo(() => {
    if (!displayValue || displayValue.length < 1) {
      return historyEntries.slice(0, 10);
    }
    const lowerQuery = displayValue.toLowerCase();
    return historyEntries
      .filter(entry => {
        const url = entry.url || entry.value || '';
        const title = entry.type === 'url' ? url : entry.value;
        return title.toLowerCase().includes(lowerQuery) || url.toLowerCase().includes(lowerQuery);
      })
      .slice(0, 10)
      .map(entry => ({
        id: entry.id,
        url: entry.url || entry.value,
        title: entry.type === 'url' ? entry.value : entry.value,
        timestamp: entry.timestamp,
      }));
  }, [displayValue, historyEntries]);

  // Show history dropdown when focused
  useEffect(() => {
    if (isFocused && filteredHistory.length > 0) {
      setShowHistory(true);
    } else if (!isFocused) {
      // Delay hiding to allow clicks
      const timer = setTimeout(() => setShowHistory(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isFocused, filteredHistory.length]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setLocalValue(newValue);
    }
    if (newValue.length >= 1) {
      setHistoryResults(
        filteredHistory as Array<{ id: string; url: string; title: string; timestamp: number }>
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = displayValue.trim();
    if (!query) return;

    // Normalize to URL or search
    const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
    const url = normalizeInputToUrlOrSearch(query, 'google');

    if (onSubmit) {
      onSubmit(url);
    } else if (tabId && navigateTab) {
      navigateTab(tabId, url);
    }

    setIsFocused(false);
    setShowHistory(false);
    inputRef.current?.blur();
  };

  const handleHistorySelect = (entry: { url: string; title?: string }) => {
    const url = entry.url || '';
    if (!url) return;
    if (onSubmit) {
      onSubmit(url);
    } else if (tabId && navigateTab) {
      navigateTab(tabId, url);
    }
    setIsFocused(false);
    setShowHistory(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    } else {
      setLocalValue('');
    }
    inputRef.current?.focus();
  };

  // Get URL security status
  const getUrlIcon = () => {
    if (!currentUrl || currentUrl === 'about:blank') return <Search size={16} />;
    if (currentUrl.startsWith('https://')) return <Lock size={16} className="text-emerald-400" />;
    if (currentUrl.startsWith('http://'))
      return <AlertTriangle size={16} className="text-amber-400" />;
    return <Globe size={16} />;
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-slate-900/50 transition-all',
            'border-slate-700 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20',
            isMobile ? 'px-3 py-2.5' : 'px-4 py-2',
            isFocused && 'shadow-lg shadow-purple-500/10',
            'overflow-hidden' // SPRINT 0: For progress bar overflow
          )}
        >
          {/* URL Icon */}
          <div className="flex-shrink-0 text-slate-400">{getUrlIcon()}</div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay blur to allow history click
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder={placeholder}
            className={cn(
              'flex-1 bg-transparent text-white placeholder-slate-500',
              'focus:outline-none',
              isMobile ? 'text-base' : 'text-sm'
            )}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Clear Button */}
          {displayValue && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 p-1 text-slate-400 transition-colors hover:text-white"
              aria-label="Clear"
            >
              <X size={16} />
            </button>
          )}

          {/* SPRINT 0: Page load progress bar */}
          <URLBarProgress isLoading={finalIsLoading} progress={finalLoadProgress} />
        </div>
      </form>

      {/* History Dropdown */}
      {showHistory && filteredHistory.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Clock size={12} />
              Recent History
            </div>
            {filteredHistory.map(entry => {
              const entryUrl = 'url' in entry ? entry.url || '' : entry.url || entry.value || '';
              const entryTitle =
                'title' in entry ? entry.title : entry.type === 'url' ? entry.value : entry.value;
              const safeUrl = entryUrl || '';
              return (
                <button
                  key={entry.id}
                  onClick={() => handleHistorySelect({ url: safeUrl, title: entryTitle })}
                  className="group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800"
                >
                  <Globe
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-slate-500 group-hover:text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white transition-colors group-hover:text-purple-300">
                      {entryTitle || entryUrl || 'Untitled'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{entryUrl}</p>
                  </div>
                  <ArrowUp
                    size={14}
                    className="flex-shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
