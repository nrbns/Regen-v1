/**
 * Universal Search UI - Real-time search across all sources
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Clock, Bookmark, FileText, Folder, Tag, X } from 'lucide-react';
import { UniversalSearch, SearchResult } from '../../core/search/UniversalSearch';
import { ipc } from '../../lib/ipc-typed';

export function UniversalSearchUI() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = UniversalSearch.createSearchDebounced(300);

  useEffect(() => {
    // Keyboard shortcut: Ctrl+K or Cmd+K
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    debouncedSearch(query, searchResults => {
      setResults(searchResults);
      setIsSearching(false);
      setSelectedIndex(0);
    });
  }, [query]);

  const handleResultClick = async (result: SearchResult) => {
    if (result.url) {
      await ipc.tabs.create(result.url);
    } else if (result.type === 'session') {
      // Load session
      const sessionId = result.id.replace('session_', '');
      // Trigger session load event
      window.dispatchEvent(new CustomEvent('load-session', { detail: { sessionId } }));
    }

    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'history':
        return <Clock className="h-4 w-4" />;
      case 'bookmark':
        return <Bookmark className="h-4 w-4" />;
      case 'session':
        return <Folder className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'tab':
        return <Tag className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'history':
        return 'History';
      case 'bookmark':
        return 'Bookmark';
      case 'session':
        return 'Session';
      case 'note':
        return 'Note';
      case 'tab':
        return 'Open Tab';
      default:
        return 'Result';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50"
        onClick={() => {
          setIsOpen(false);
          setQuery('');
          setResults([]);
        }}
      />

      {/* Search Modal */}
      <div className="fixed left-1/2 top-1/4 z-[9999] w-full max-w-2xl -translate-x-1/2">
        <div className="overflow-hidden rounded-2xl border border-purple-500/50 bg-gray-900 shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-gray-700 p-4">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search history, bookmarks, sessions, notes..."
              className="flex-1 bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none"
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && results[selectedIndex]) {
                  e.preventDefault();
                  handleResultClick(results[selectedIndex]);
                }
              }}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-400">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {isSearching && query ? (
              <div className="p-8 text-center text-gray-400">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                <p className="text-sm">Searching...</p>
              </div>
            ) : results.length === 0 && query ? (
              <div className="p-8 text-center text-gray-400">
                <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-sm">No results found</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-gray-800 ${
                      index === selectedIndex ? 'bg-gray-800' : ''
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0 text-purple-400">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{result.title}</p>
                        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                          {getResultTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.url && (
                        <p className="mb-1 truncate text-xs text-gray-400">{result.url}</p>
                      )}
                      <p
                        className="line-clamp-2 text-xs text-gray-500"
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                      {result.timestamp && (
                        <p className="mt-1 text-xs text-gray-600">
                          {new Date(result.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="mb-2 text-sm">Universal Search</p>
                <p className="text-xs text-gray-500">
                  Search across history, bookmarks, sessions, notes, and tabs
                </p>
                <p className="mt-4 text-xs text-gray-600">
                  Press{' '}
                  <kbd className="rounded border border-gray-700 bg-gray-800 px-2 py-1">Ctrl+K</kbd>{' '}
                  to open
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
