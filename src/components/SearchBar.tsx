/**
 * SearchBar - Lightweight search component with DuckDuckGo Instant + Lunr local fallback
 * This is a minimal, working search that returns results immediately
 */

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Globe, FileText, Sparkles } from 'lucide-react';
import { fetchDuckDuckGoInstant, formatDuckDuckGoResults } from '../services/duckDuckGoSearch';
import { searchLocal } from '../utils/lunrIndex';
import { ipc } from '../lib/ipc-typed';
import { trackSearch } from '../core/supermemory/tracker';
import { useSuggestions } from '../core/supermemory/useSuggestions';

type SearchResult = {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  type: 'duck' | 'local';
  source?: 'instant' | 'result' | 'related';
};

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [duckResults, setDuckResults] = useState<SearchResult[]>([]);
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // SuperMemory suggestions
  const suggestions = useSuggestions(q, { types: ['search', 'visit', 'bookmark'], limit: 5 });

  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setDuckResults([]);
      setLocalResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch both in parallel
        const [duckData, localData] = await Promise.all([
          fetchDuckDuckGoInstant(q).catch(() => null),
          searchLocal(q).catch(() => []),
        ]);
        
        if (cancelled) return;
        
        // Format DuckDuckGo results
        if (duckData) {
          const formatted = formatDuckDuckGoResults(duckData).map((r, idx) => ({
            id: `duck-${idx}`,
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            type: 'duck' as const,
            source: r.type,
          }));
          setDuckResults(formatted);
        } else {
          setDuckResults([]);
        }
        
        // Format local results
        const local = localData.map((r, idx) => ({
          id: `local-${r.id || idx}`,
          title: r.title,
          snippet: r.snippet,
          type: 'local' as const,
        }));
        setLocalResults(local);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const t = setTimeout(run, 150); // debounce
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const handleResultClick = async (result: SearchResult) => {
    if (result.url) {
      // Track visit in SuperMemory
      trackSearch(result.url, { url: result.url, title: result.title }).catch(console.error);
      
      try {
        await ipc.tabs.create(result.url);
      } catch (error) {
        console.error('[SearchBar] Failed to open URL:', error);
        // Fallback: open in external browser
        if (typeof window !== 'undefined') {
          window.open(result.url, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

  const handleSuggestionClick = async (suggestion: { value: string; type: string; metadata?: any }) => {
    // Track suggestion click
    trackSearch(suggestion.value, { url: suggestion.metadata?.url, title: suggestion.metadata?.title }).catch(console.error);
    
    setQ(suggestion.value);
    
    // If it's a URL, open it
    if (suggestion.metadata?.url) {
      try {
        await ipc.tabs.create(suggestion.metadata.url);
      } catch (error) {
        console.error('[SearchBar] Failed to open suggestion URL:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    
    // Track search
    trackSearch(query).catch(console.error);
    
    // Try to open as URL or search
    try {
      const url = query.startsWith('http://') || query.startsWith('https://') 
        ? query 
        : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await ipc.tabs.create(url);
      setQ('');
    } catch (error) {
      console.error('[SearchBar] Failed to open URL:', error);
    }
  };

  const allResults = [...duckResults, ...localResults];
  const hasResults = allResults.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-900/60 px-4 py-3 shadow-inner focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search the web or docs..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none"
            autoFocus
          />
          {loading && (
            <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />
          )}
        </div>

        {/* SuperMemory Suggestions */}
        {suggestions.length > 0 && q.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-purple-700/50 bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50">
            <div className="p-3 border-b border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-purple-400" />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Suggested for you</h3>
              </div>
              <div className="space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`suggestion-${idx}-${suggestion.value}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <div className="text-sm font-medium text-purple-200 line-clamp-1">{suggestion.value}</div>
                    {suggestion.metadata?.title && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{suggestion.metadata.title}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {suggestion.count > 1 ? `Used ${suggestion.count} times` : 'Recently used'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Dropdown */}
        {hasResults && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-gray-700/50 bg-gray-900/95 backdrop-blur-xl shadow-2xl max-h-[500px] overflow-y-auto z-50">
            {duckResults.length > 0 && (
              <div className="p-3 border-b border-gray-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={14} className="text-blue-400" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Web Results</h3>
                </div>
                <div className="space-y-1">
                  {duckResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <div className="text-sm font-medium text-white line-clamp-1">{result.title}</div>
                      {result.snippet && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{result.snippet}</div>
                      )}
                      {result.url && (
                        <div className="text-xs text-gray-500 mt-1 truncate">{result.url}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {localResults.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-green-400" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Local Docs</h3>
                </div>
                <div className="space-y-1">
                  {localResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <div className="text-sm font-medium text-white line-clamp-1">{result.title}</div>
                      {result.snippet && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{result.snippet}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="absolute top-full left-0 right-0 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-200">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

