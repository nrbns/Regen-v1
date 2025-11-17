/**
 * SearchBar - Lightweight search component with DuckDuckGo Instant + Lunr local fallback
 * This is a minimal, working search that returns results immediately
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Globe, FileText, Sparkles, Brain, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchDuckDuckGoInstant, formatDuckDuckGoResults } from '../services/duckDuckGoSearch';
import { searchLocal } from '../utils/lunrIndex';
import { ipc } from '../lib/ipc-typed';
import { trackSearch } from '../core/supermemory/tracker';
import { useSuggestions } from '../core/supermemory/useSuggestions';
import { searchVectors } from '../core/supermemory/vectorStore';
import { sendPrompt } from '../core/llm/adapter';
import { useTabsStore } from '../state/tabsStore';
import { EcoBadge } from './EcoBadge';
import { getQueryEngine, QueryResult } from '../core/query-engine';
import { AnswerCard } from './AnswerCard';

// Search proxy base URL (defaults to localhost:3001)
const SEARCH_PROXY_URL = import.meta.env.VITE_SEARCH_PROXY_URL || 'http://localhost:3001';
// Redix core base URL (defaults to localhost:8001)
const REDIX_CORE_URL = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';

type SearchResult = {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  type: 'duck' | 'local' | 'memory' | 'proxy';
  source?: 'instant' | 'result' | 'related' | 'duckduckgo' | 'bing' | 'brave';
  similarity?: number; // For vector search results
};

type SearchSummary = {
  text: string;
  citations: Array<{ index: number; url: string; title: string }>;
  latency?: number;
};

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [duckResults, setDuckResults] = useState<SearchResult[]>([]);
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);
  const [memoryResults, setMemoryResults] = useState<SearchResult[]>([]);
  const [proxyResults, setProxyResults] = useState<SearchResult[]>([]);
  const [searchSummary, setSearchSummary] = useState<SearchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [askingAboutPage, setAskingAboutPage] = useState(false);
  const [searchLatency, setSearchLatency] = useState<number | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false); // Collapsed by default
  const aiSessionRef = useRef<string>(`search-${Date.now()}`);
  
  // Get active tab for "Ask about this page"
  const activeTab = useTabsStore((state) => {
    if (!state.activeId) return null;
    return state.tabs.find((t) => t.id === state.activeId) || null;
  });
  
  // SuperMemory suggestions
  const suggestions = useSuggestions(q, { types: ['search', 'visit', 'bookmark'], limit: 5 });

  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setDuckResults([]);
      setLocalResults([]);
      setProxyResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      
      try {
        // Fetch all sources in parallel
        const [duckData, localData, vectorResults, proxyData] = await Promise.all([
          fetchDuckDuckGoInstant(q).catch(() => null),
          searchLocal(q).catch(() => []),
          searchVectors(q, { maxVectors: 5, minSimilarity: 0.6 }).catch(() => []),
          // Try to fetch from search-proxy, but fallback to DuckDuckGo if unavailable
          fetch(`${SEARCH_PROXY_URL}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, sources: ['duckduckgo'], limit: 10 }),
          }).then(res => res.ok ? res.json() : null).catch(() => null),
        ]);
        
        if (cancelled) return;
        
        const latency = Date.now() - startTime;
        setSearchLatency(latency);
        
        // Track metrics
        if (latency > 0) {
          console.debug(`[SearchBar] Search completed in ${latency}ms`);
        }
        
        // Format search-proxy results (preferred if available)
        if (proxyData && Array.isArray(proxyData.results)) {
          const formatted = proxyData.results.map((r: any, idx: number) => ({
            id: `proxy-${idx}`,
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            type: 'proxy' as const,
            source: r.source,
          }));
          setProxyResults(formatted);
          setDuckResults([]); // Don't show duplicate DuckDuckGo results
        } else {
          setProxyResults([]);
          // Format DuckDuckGo results (fallback)
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
        }
        
        // Format local results
        const local = localData.map((r, idx) => ({
          id: `local-${r.id || idx}`,
          title: r.title,
          snippet: r.snippet,
          type: 'local' as const,
        }));
        setLocalResults(local);
        
        // Format memory/vector search results
        const memory = vectorResults
          .filter((r) => r.similarity >= 0.6)
          .map((r, idx) => ({
            id: `memory-${r.embedding.id || idx}`,
            title: r.embedding.metadata?.title || r.embedding.text.substring(0, 50) || 'Memory',
            url: r.embedding.metadata?.url,
            snippet: r.embedding.text.substring(0, 150),
            type: 'memory' as const,
            similarity: r.similarity,
          }));
        setMemoryResults(memory);
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
      // Track search result click
      trackSearch(result.url, { 
        url: result.url, 
        title: result.title,
        clickedResult: {
          url: result.url,
          title: result.title,
          position: 0, // Would need to track position from results array
        },
      }).catch(console.error);
      
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
    
    // If it's a URL, open it directly
    if (query.startsWith('http://') || query.startsWith('https://')) {
      try {
        await ipc.tabs.create(query);
        setQ('');
        return;
      } catch (error) {
        console.error('[SearchBar] Failed to open URL:', error);
      }
    }
    
    // PHASE 1: Use QueryEngine for AI-Native answers
    setAiLoading(true);
    setShowAiResponse(true);
    setQueryResult(null);
    setAiResponse('');
    setSearchSummary(null);
    setError(null);
    setShowSearchResults(false); // Hide search results by default
    
    const startTime = Date.now();
    
    try {
      // Get active tab context
      const tabContext = activeTab ? {
        tabUrl: activeTab.url,
        tabTitle: activeTab.title,
        mode: 'research', // Could be dynamic based on current mode
      } : undefined;
      
      // Use QueryEngine to get structured answer
      const queryEngine = getQueryEngine();
      const result = await queryEngine.query(query, tabContext);
      
      setQueryResult(result);
      setAiResponse(result.answer);
      setSearchLatency(result.latency);
      
      // Update search results from query result sources
      if (result.sources.length > 0) {
        const formatted = result.sources.map((source, idx) => ({
          id: `source-${idx}`,
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          type: 'proxy' as const,
          source: 'fused' as const,
        }));
        setProxyResults(formatted);
      } else {
        // Fallback: Fetch search results if QueryEngine didn't provide sources
        try {
          const searchResponse = await fetch(`${SEARCH_PROXY_URL}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query, 
              sources: ['duckduckgo'], 
              limit: 10,
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.results && Array.isArray(searchData.results)) {
              const formatted = searchData.results.map((r: any, idx: number) => ({
                id: `proxy-${idx}`,
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                type: 'proxy' as const,
                source: r.source,
              }));
              setProxyResults(formatted);
            }
          }
        } catch (searchError) {
          console.warn('[SearchBar] Fallback search failed:', searchError);
        }
      }
      
      setAiLoading(false);
      return; // Success - exit early
      
    } catch (queryError) {
      console.error('[SearchBar] QueryEngine failed:', queryError);
      
      // Fallback to original search flow
      try {
        // Fallback: try Redix /ask endpoint with SSE streaming (preferred)
        try {
          // Try streaming first for better UX
          const eventSource = new EventSource(`${REDIX_CORE_URL}/ask?stream=true`, {
            // Note: EventSource only supports GET, so we'll use fetch with SSE manually
          });
          
          // Use fetch with manual SSE parsing instead
          const streamResponse = await fetch(`${REDIX_CORE_URL}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              context: activeTab ? { url: activeTab.url, title: activeTab.title } : undefined,
              options: { provider: 'auto', maxTokens: 500 },
              stream: true,
            }),
          });

          if (streamResponse.ok && streamResponse.body) {
            // Parse SSE stream
            const reader = streamResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponse = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'token' && data.text) {
                      fullResponse += data.text;
                      setAiResponse(fullResponse);
                    } else if (data.type === 'done') {
                      console.debug(`[SearchBar] Redix stream complete (green score: ${data.greenScore}, latency: ${data.latency}ms)`);
                      break;
                    } else if (data.type === 'error') {
                      throw new Error(data.error || 'Streaming error');
                    }
                  } catch (e) {
                    console.warn('[SearchBar] Failed to parse SSE chunk:', e);
                  }
                }
              }
            }
          } else {
            throw new Error(`Redix streaming failed: ${streamResponse.statusText}`);
          }
        } catch (streamError) {
          console.warn('[SearchBar] Redix streaming failed, trying non-streaming:', streamError);
          // Fallback to non-streaming /ask endpoint
          try {
            const redixResponse = await fetch(`${REDIX_CORE_URL}/ask`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query,
                context: activeTab ? { url: activeTab.url, title: activeTab.title } : undefined,
                options: { provider: 'auto', maxTokens: 500 },
              }),
            }).catch(() => {
              // Network error - show user-friendly message
              throw new Error('Search service temporarily unavailable. Please try again.');
            });
            
            if (!redixResponse.ok) {
              const errorData = await redixResponse.json().catch(() => ({}));
              throw new Error(errorData.error || `Search failed: ${redixResponse.statusText}`);
            }

            if (redixResponse.ok) {
            const redixData = await redixResponse.json();
            setAiResponse(redixData.text || 'No response from Redix');
            
            // Log eco metrics if available
            if (redixData.greenScore !== undefined) {
              console.debug(`[SearchBar] Redix /ask response (green score: ${redixData.greenScore}%, tier: ${redixData.greenTier}, CO2 saved: ${redixData.co2SavedG}g, latency: ${redixData.latency}ms)`);
              
              // Store eco data for UI display
              if (redixData.greenTier && redixData.tierColor) {
                // Can be used to show eco badge in search results
                (window as any).__lastEcoScore = {
                  score: redixData.greenScore,
                  tier: redixData.greenTier,
                  color: redixData.tierColor,
                  co2Saved: redixData.co2SavedG,
                  recommendation: redixData.recommendation
                };
              }
            }
            } else {
              throw new Error(`Redix API error: ${redixResponse.statusText}`);
            }
          } catch (redixError) {
            console.warn('[SearchBar] Redix /ask fallback failed:', redixError);
            // Final fallback: use LLM adapter directly
            try {
              const llmResponse = await sendPrompt(query, {
                systemPrompt: 'You are a helpful search assistant. Provide a concise answer.',
                maxTokens: 500,
              });
              setAiResponse(llmResponse.text || 'No response');
            } catch (llmError) {
              console.error('[SearchBar] LLM adapter fallback failed:', llmError);
              setError('AI services unavailable. Please check your API keys.');
            }
          }
        }
      }
      
      setAiLoading(false);
    } catch (err) {
      console.error('[SearchBar] Search with summary failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to get search results');
      setAiLoading(false);
      
      // Fallback: open search results in a tab
      try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await ipc.tabs.create(searchUrl);
      } catch (error) {
        console.error('[SearchBar] Failed to open search URL:', error);
      }
    }
  };

  const allResults = [...memoryResults, ...proxyResults, ...duckResults, ...localResults];
  const hasResults = allResults.length > 0;

  // Handle "Ask about this page"
  const handleAskAboutPage = async () => {
    if (!activeTab?.url || !activeTab.title) {
      setError('No active page to ask about');
      return;
    }

    setAskingAboutPage(true);
    setShowAiResponse(true);
    setAiResponse('');
    setError(null);

    try {
      // Use LLM adapter to ask about the page
      const prompt = `Based on the page "${activeTab.title}" (${activeTab.url}), answer the user's question: ${q || 'What is this page about?'}`;
      
      const response = await sendPrompt(prompt, {
        systemPrompt: 'You are a helpful assistant that answers questions about web pages based on their title and URL.',
        maxTokens: 500,
      });

      setAiResponse(response.text);
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response about page');
    } finally {
      setAskingAboutPage(false);
    }
  };

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
          {activeTab?.url && activeTab.url.startsWith('http') && (
            <button
              type="button"
              onClick={handleAskAboutPage}
              disabled={askingAboutPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ask AI about this page"
            >
              <Brain size={14} className={askingAboutPage ? 'animate-pulse' : ''} />
              <span>Ask about page</span>
            </button>
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
            {memoryResults.length > 0 && (
              <div className="p-3 border-b border-gray-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-purple-400" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Memory Results</h3>
                </div>
                <div className="space-y-1">
                  {memoryResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-purple-200 line-clamp-1">{result.title}</div>
                        {result.similarity !== undefined && (
                          <span className="text-xs text-purple-400/70 ml-2">
                            {Math.round(result.similarity * 100)}%
                          </span>
                        )}
                      </div>
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
            {proxyResults.length > 0 && (
              <div className="p-3 border-b border-gray-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={14} className="text-blue-400" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Search Results</h3>
                </div>
                <div className="space-y-1">
                  {proxyResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <div className="text-sm font-medium text-white line-clamp-1">{result.title}</div>
                      {result.snippet && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{result.snippet}</div>
                      )}
                      {result.url && (
                        <div className="text-xs text-gray-500 mt-1 truncate">{result.url}</div>
                      )}
                      {result.source && (
                        <div className="text-xs text-gray-600 mt-1 capitalize">{result.source}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

      {/* PHASE 1: Answer-First UI - Show AnswerCard FIRST */}
      {showAiResponse && (
        <div className="mt-4 space-y-4">
          {/* Answer Card (Primary) */}
          {queryResult ? (
            <AnswerCard
              result={queryResult}
              onViewSource={(url) => {
                ipc.tabs.create(url).catch(console.error);
              }}
              onViewFullPage={(url) => {
                ipc.tabs.create(url).catch(console.error);
              }}
            />
          ) : (aiLoading || askingAboutPage) ? (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Loader2 size={16} className="text-blue-400 animate-spin" />
                <span className="text-sm text-gray-300">
                  {askingAboutPage ? 'Analyzing page...' : 'Getting AI answer...'}
                </span>
              </div>
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700/50 rounded w-full"></div>
                <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
              </div>
            </div>
          ) : aiResponse ? (
            // Fallback: Show simple answer if QueryEngine not available
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-300">AI Answer</h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {aiResponse}
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Search Results (Secondary - Collapsed by default) */}
          {allResults.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSearchResults(!showSearchResults)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {allResults.length} search result{allResults.length > 1 ? 's' : ''} available
                  </span>
                  <span className="text-xs text-gray-500">
                    (Click to {showSearchResults ? 'hide' : 'view'} sources)
                  </span>
                </div>
                {showSearchResults ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              
              {showSearchResults && (
                <div className="border-t border-gray-800/50 max-h-[400px] overflow-y-auto">
                  {proxyResults.length > 0 && (
                    <div className="p-3 border-b border-gray-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={14} className="text-blue-400" />
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Web Results</h3>
                      </div>
                      <div className="space-y-1">
                        {proxyResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleResultClick(result)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  
                  {duckResults.length > 0 && (
                    <div className="p-3 border-b border-gray-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={14} className="text-blue-400" />
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Additional Results</h3>
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
            </div>
          )}
          
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

