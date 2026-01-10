/**
 * Production Search Bar Component
 * Connects to production /api/search endpoint with loading states and error handling
 */

import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Sparkles, X } from 'lucide-react';
import { useProductionSearch } from '../../hooks/useProductionSearch';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../utils/useDebounce';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../utils/mobileDetection';
import { cn } from '../../lib/utils';

interface ProductionSearchBarProps {
  onResultClick?: (url: string) => void;
  placeholder?: string;
  autoSearch?: boolean; // Auto-search on query change
  debounceMs?: number;
  showSummarize?: boolean; // Show summarize button for results
}

export function ProductionSearchBar({
  onResultClick,
  placeholder: placeholderProp,
  autoSearch = true,
  debounceMs = 500,
  showSummarize = true,
}: ProductionSearchBarProps) {
  const { t } = useTranslation();
  const { isMobile } = useMobileDetection();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, debounceMs);

  // Use translated placeholder or fallback to prop
  const placeholder = placeholderProp || t('search.placeholder');

  const {
    search,
    searchResults,
    isSearching,
    searchError,
    summarize,
    isSummarizing,
    summarizeResults,
  } = useProductionSearch();

  // Auto-search when query changes (if enabled)
  useEffect(() => {
    if (autoSearch && debouncedQuery.trim().length >= 2) {
      search(debouncedQuery, { maxResults: 8 });
      setShowResults(true);
    } else if (debouncedQuery.trim().length === 0) {
      setShowResults(false);
    }
  }, [debouncedQuery, autoSearch, search]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Close on Escape
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResults]);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      toast.warning('Please enter at least 2 characters');
      return;
    }

    const searchQuery = query.trim();
    
    // Emit search event for real-time AI observation
    import('../../lib/events/EventBus').then(({ emitSearch }) => {
      emitSearch(searchQuery, 10); // Emit with expected results count
    }).catch(() => {
      // EventBus not available - graceful degradation
    });

    await search(searchQuery, { maxResults: 10 });
    setShowResults(true);
  };

  const handleSummarize = async (urls: string[]) => {
    if (urls.length === 0) {
      toast.warning('No URLs to summarize');
      return;
    }

    await summarize(urls, {
      maxLength: 300,
      includeBullets: true,
      includeCitations: true,
    });
  };

  const handleResultClick = (url: string) => {
    if (onResultClick) {
      onResultClick(url);
    } else {
      window.open(url, '_blank');
    }
    setShowResults(false);
  };

  return (
    <div className="relative w-full">
      {/* Search Input - Desktop browser only */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setShowResults(false);
              }}
              className="p-1 text-gray-400 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-purple-400" />
          )}
          {searchError && (
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" aria-label={searchError} />
          )}
        </div>

      {/* Error indicator */}
      {searchError && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && (searchResults || searchError) && (
        <div
          className={cn(
            'z-50 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl',
            isMobile
              ? 'fixed inset-x-4 bottom-20 top-[100px] max-h-[calc(100vh-120px)]' // Mobile: fixed position
              : 'absolute left-0 right-0 top-full mt-2 max-h-96' // Desktop: absolute position
          )}
        >
          {searchError ? (
            <div className="p-4 text-center text-sm text-red-400">
              <AlertCircle className="mx-auto mb-2 h-5 w-5" />
              <p>{searchError}</p>
              <button
                onClick={handleSearch}
                className="mt-3 rounded bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700"
              >
                Retry
              </button>
            </div>
          ) : searchResults && searchResults.results.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
                <div className="text-xs text-gray-400">
                  {searchResults.count} results
                  {searchResults.cached && <span className="ml-2 text-green-400">(cached)</span>}
                  <span className="ml-2">• {searchResults.latency_ms}ms</span>
                </div>
                {showSummarize && (
                  <button
                    onClick={() =>
                      handleSummarize(searchResults.results.slice(0, 3).map(r => r.url))
                    }
                    disabled={isSummarizing}
                    className="flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Summarize Top 3
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Results List - Enhanced with AI Result Blocks */}
              <div className="py-2">
                {searchResults.results.map((result, index) => (
                  <div
                    key={`${result.url}-${index}`}
                    className="border-b border-gray-800 px-4 py-3 last:border-b-0"
                  >
                    {/* Use enhanced result display */}
                    <div
                      className="-m-2 flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-800/50"
                      onClick={() => handleResultClick(result.url)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">{result.title}</p>
                          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
                            {result.source}
                          </span>
                          {result.score && (
                            <span className="text-xs text-gray-600">
                              {(result.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {result.domain && (
                          <p className="mb-1 truncate text-xs text-purple-400">{result.domain}</p>
                        )}
                        <p className="line-clamp-2 text-xs text-gray-400">{result.snippet}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summaries (if available) */}
              {summarizeResults && summarizeResults.summaries.length > 0 && (
                <div className="border-t border-gray-700 bg-gray-800/50 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Summaries
                  </h3>
                  <div className="space-y-3">
                    {summarizeResults.summaries.map((summary, idx) => (
                      <div key={idx} className="rounded bg-gray-900 p-3">
                        <h4 className="mb-2 text-xs font-medium text-white">{summary.title}</h4>
                        <p className="mb-2 text-xs text-gray-300">{summary.summary}</p>
                        {summary.bullets && summary.bullets.length > 0 && (
                          <ul className="ml-4 list-disc space-y-1 text-xs text-gray-400">
                            {summary.bullets.map((bullet, i) => (
                              <li key={i}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                        {summary.citations && summary.citations.length > 0 && (
                          <div className="mt-2 border-t border-gray-700 pt-2">
                            <p className="mb-1 text-xs text-gray-500">Sources:</p>
                            {summary.citations.map((cite, i) => (
                              <a
                                key={i}
                                href={cite.url}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleResultClick(cite.url);
                                }}
                                className="block truncate text-xs text-purple-400 hover:underline"
                              >
                                {cite.title || cite.url}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No results found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
