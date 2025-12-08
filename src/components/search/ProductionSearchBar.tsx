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
import { MobileSearchInput } from './MobileSearchInput';
import { useMobileDetection } from '../../hooks/useMobileDetection';
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

    await search(query.trim(), { maxResults: 10 });
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
      {/* Search Input - Use MobileSearchInput on mobile for better UX */}
      {isMobile ? (
        <MobileSearchInput
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          placeholder={placeholder}
          isLoading={isSearching}
          autoFocus={false}
        />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setShowResults(false);
              }}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="h-4 w-4 text-purple-400 animate-spin flex-shrink-0" />
          )}
          {searchError && (
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" aria-label={searchError} />
          )}
        </div>
      )}

      {/* Error indicator for mobile */}
      {isMobile && searchError && (
        <div className="mt-2 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && (searchResults || searchError) && (
        <div
          className={cn(
            'bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-y-auto z-50',
            isMobile
              ? 'fixed inset-x-4 top-[100px] bottom-20 max-h-[calc(100vh-120px)]' // Mobile: fixed position
              : 'absolute top-full left-0 right-0 mt-2 max-h-96' // Desktop: absolute position
          )}
        >
          {searchError ? (
            <div className="p-4 text-center text-red-400 text-sm">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              <p>{searchError}</p>
              <button
                onClick={handleSearch}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : searchResults && searchResults.results.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {searchResults.count} results
                  {searchResults.cached && (
                    <span className="ml-2 text-green-400">(cached)</span>
                  )}
                  <span className="ml-2">• {searchResults.latency_ms}ms</span>
                </div>
                {showSummarize && (
                  <button
                    onClick={() =>
                      handleSummarize(searchResults.results.slice(0, 3).map(r => r.url))
                    }
                    disabled={isSummarizing}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-white transition-colors"
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
                    className="px-4 py-3 border-b border-gray-800 last:border-b-0"
                  >
                    {/* Use enhanced result display */}
                    <div className="flex items-start gap-3 cursor-pointer hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors"
                         onClick={() => handleResultClick(result.url)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">{result.title}</p>
                          <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-800 rounded">
                            {result.source}
                          </span>
                          {result.score && (
                            <span className="text-xs text-gray-600">
                              {(result.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {result.domain && (
                          <p className="text-xs text-purple-400 truncate mb-1">{result.domain}</p>
                        )}
                        <p className="text-xs text-gray-400 line-clamp-2">{result.snippet}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summaries (if available) */}
              {summarizeResults && summarizeResults.summaries.length > 0 && (
                <div className="border-t border-gray-700 p-4 bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Summaries
                  </h3>
                  <div className="space-y-3">
                    {summarizeResults.summaries.map((summary, idx) => (
                      <div key={idx} className="bg-gray-900 rounded p-3">
                        <h4 className="text-xs font-medium text-white mb-2">{summary.title}</h4>
                        <p className="text-xs text-gray-300 mb-2">{summary.summary}</p>
                        {summary.bullets && summary.bullets.length > 0 && (
                          <ul className="text-xs text-gray-400 space-y-1 ml-4 list-disc">
                            {summary.bullets.map((bullet, i) => (
                              <li key={i}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                        {summary.citations && summary.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-500 mb-1">Sources:</p>
                            {summary.citations.map((cite, i) => (
                              <a
                                key={i}
                                href={cite.url}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleResultClick(cite.url);
                                }}
                                className="text-xs text-purple-400 hover:underline block truncate"
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
            <div className="p-8 text-center text-gray-400 text-sm">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

