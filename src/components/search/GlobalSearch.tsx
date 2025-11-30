// Global Search Component - Ctrl+K / Cmd+K
// Full-text search across Tabs, Notes, Research, Charts
// Supports Hindi + English

import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Globe, BookOpen, BarChart3, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';
import { multiSearch } from '../../lib/meili';

interface SearchResult {
  id: string | number;
  title?: string;
  content?: string;
  url?: string;
  symbol?: string;
  _index: string;
  [key: string]: any;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tabs, setActive } = useTabsStore();

  // Multi-search across all indexes
  async function performSearch(searchQuery: string) {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Use MeiliSearch multi-search function
      const data = await multiSearch([
        { indexUid: 'tabs', q: searchQuery, limit: 5 },
        { indexUid: 'notes', q: searchQuery, limit: 5 },
        { indexUid: 'research', q: searchQuery, limit: 5 },
        { indexUid: 'charts', q: searchQuery, limit: 5 },
      ]);

      // Flatten results from all indexes
      const allResults: SearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result: any) => {
          if (result.hits && Array.isArray(result.hits)) {
            result.hits.forEach((hit: any) => {
              allResults.push({
                ...hit,
                _index: result.indexUid,
              });
            });
          }
        });
      }

      setResults(allResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('[GlobalSearch] Search error:', error);
      // If MeiliSearch is not available or indexes don't exist, show empty results
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, open]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }

      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
        setResults([]);
      }

      // Arrow keys to navigate
      if (open && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < results.length) {
          e.preventDefault();
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleResultClick = (result: SearchResult) => {
    if (result._index === 'tabs' && result.url) {
      // Find or create tab
      const existingTab = tabs.find(t => t.url === result.url);
      if (existingTab) {
        setActive(existingTab.id);
      } else {
        // Create new tab
        useTabsStore.getState().add({
          id: `tab-${Date.now()}`,
          title: result.title || 'New Tab',
          url: result.url,
        });
      }
    } else if (result._index === 'notes' || result._index === 'research') {
      // Open in research mode or notes view
      // TODO: Implement navigation to notes/research
      console.log('Open note/research:', result);
    } else if (result._index === 'charts') {
      // Open chart
      // TODO: Implement chart navigation
      console.log('Open chart:', result);
    }

    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const getResultIcon = (index: string) => {
    switch (index) {
      case 'tabs':
        return <Globe size={16} className="text-blue-400" />;
      case 'notes':
        return <FileText size={16} className="text-green-400" />;
      case 'research':
        return <BookOpen size={16} className="text-purple-400" />;
      case 'charts':
        return <BarChart3 size={16} className="text-yellow-400" />;
      default:
        return <Search size={16} className="text-gray-400" />;
    }
  };

  const getResultTitle = (result: SearchResult) => {
    return result.title || result.content || result.symbol || 'Untitled';
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-start justify-center pt-32"
          onClick={() => {
            setOpen(false);
            setQuery('');
            setResults([]);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-3xl bg-gray-900 rounded-2xl shadow-2xl border border-purple-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-800">
              <Search size={20} className="text-purple-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search tabs, notes, charts, research… (Hindi bhi chalega)"
                className="flex-1 bg-transparent text-white placeholder-purple-400 outline-none text-lg"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setQuery('');
                    setResults([]);
                  }
                }}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                </div>
              ) : results.length === 0 && query.length >= 2 ? (
                <div className="text-center text-gray-500 py-12">
                  No results found for "{query}"
                </div>
              ) : results.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p className="mb-2">Type to search...</p>
                  <p className="text-sm text-gray-600">
                    Search across tabs, notes, research, and charts
                  </p>
                </div>
              ) : (
                results.map((result, index) => (
                  <motion.div
                    key={`${result._index}-${result.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`px-6 py-4 cursor-pointer flex items-center gap-4 transition-colors ${
                      index === selectedIndex
                        ? 'bg-purple-900/50 border-l-2 border-purple-400'
                        : 'hover:bg-purple-900/30'
                    }`}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {getResultIcon(result._index)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-purple-400 uppercase font-medium">
                          {result._index}
                        </span>
                        {result.timestamp && (
                          <span className="text-xs text-gray-500">
                            <Clock size={12} className="inline mr-1" />
                            {new Date(result.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="text-white font-medium truncate">
                        {getResultTitle(result)}
                      </div>
                      {result.content && result.content !== getResultTitle(result) && (
                        <div className="text-sm text-gray-400 truncate mt-1">
                          {result.content.slice(0, 100)}
                          {result.content.length > 100 ? '...' : ''}
                        </div>
                      )}
                      {result.url && (
                        <div className="text-xs text-gray-500 truncate mt-1">{result.url}</div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-800 text-xs text-gray-500 flex items-center justify-between">
                <span>↑↓ Navigate • Enter Select • Esc Close</span>
                <span>
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
