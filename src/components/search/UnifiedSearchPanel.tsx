/**
 * Unified Search Panel
 * 
 * Real-time search UI for downloads, history, and bookmarks.
 * Shows results as user types with instant feedback.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, History, Bookmark, X, ExternalLink } from 'lucide-react';
import { realtimeUnifiedSearch, type UnifiedSearchResult } from '../../core/search/realtimeUnifiedSearch';
import { regenEventBus } from '../../core/events/eventBus';

interface UnifiedSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (result: UnifiedSearchResult) => void;
}

export function UnifiedSearchPanel({ isOpen, onClose, onSelect }: UnifiedSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Subscribe to search results
  useEffect(() => {
    const unsubscribe = realtimeUnifiedSearch.onResults((newResults) => {
      setResults(newResults);
      setIsSearching(false);
      setSelectedIndex(0);
    });

    return unsubscribe;
  }, []);

  // Perform search as user types
  useEffect(() => {
    if (!isOpen) return;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    realtimeUnifiedSearch
      .search({ query: trimmedQuery })
      .catch((error) => {
        console.error('[UnifiedSearchPanel] Search error:', error);
        setIsSearching(false);
      });
  }, [query, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Reset when panel closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      realtimeUnifiedSearch.clear();
    }
  }, [isOpen]);

  const handleSelect = (result: UnifiedSearchResult) => {
    if (onSelect) {
      onSelect(result);
    } else {
      // Default: open URL in new tab
      if (result.url) {
        regenEventBus.emit({
          type: 'COMMAND',
          payload: `navigate ${result.url}`,
        });
      }
    }
    onClose();
  };

  const getIcon = (type: UnifiedSearchResult['type']) => {
    switch (type) {
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'history':
        return <History className="w-4 h-4" />;
      case 'bookmark':
        return <Bookmark className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: UnifiedSearchResult['type']) => {
    switch (type) {
      case 'download':
        return 'Download';
      case 'history':
        return 'History';
      case 'bookmark':
        return 'Bookmark';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search downloads, history, bookmarks..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-96 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {isSearching && (
            <div className="p-8 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-600 border-t-slate-400"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          )}

          {!isSearching && results.length === 0 && query.trim().length >= 2 && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">No results found</p>
            </div>
          )}

          {!isSearching && query.trim().length < 2 && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          )}

          {!isSearching &&
            results.length > 0 &&
            results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-slate-800 transition-colors ${
                  index === selectedIndex ? 'bg-slate-800' : ''
                }`}
              >
                <div className="mt-0.5 text-slate-400">{getIcon(result.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{result.title}</p>
                    <span className="text-xs text-slate-500">{getTypeLabel(result.type)}</span>
                  </div>
                  {result.subtitle && (
                    <p className="text-xs text-slate-400 mt-0.5">{result.subtitle}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 truncate">{result.url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </button>
            ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              <span>↑↓ Navigate • Enter Select • Esc Close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
