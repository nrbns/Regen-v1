/**
 * Realtime Search Preview - Telepathy Upgrade Phase 1
 * Live top-5 preview under omnibar with 150ms debounce
 * Feels exactly like Perplexity Pro on steroids
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Globe, FileText, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';
import { hnswService } from '../../services/vector/hnswService';
import { useDebounce } from '../../utils/useDebounce';

interface SearchPreviewResult {
  id: string;
  title: string;
  url?: string;
  type: 'tab' | 'memory' | 'web';
  score: number;
  snippet?: string;
}

interface RealtimeSearchPreviewProps {
  query: string;
  onSelect: (result: SearchPreviewResult) => void;
  isVisible: boolean;
}

export function RealtimeSearchPreview({ query, onSelect, isVisible }: RealtimeSearchPreviewProps) {
  const [results, setResults] = useState<SearchPreviewResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { tabs } = useTabsStore();

  // Debounce query for 150ms (telepathy-level responsiveness)
  const debouncedQuery = useDebounce(query, 150);

  // Realtime search as user types
  useEffect(() => {
    if (!isVisible || !debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const performRealtimeSearch = async () => {
      setLoading(true);
      try {
        // 1. Search tabs (instant, local)
        const tabResults: SearchPreviewResult[] = tabs
          .filter(tab => {
            const searchText = `${tab.title} ${tab.url}`.toLowerCase();
            return searchText.includes(debouncedQuery.toLowerCase());
          })
          .slice(0, 3)
          .map(tab => ({
            id: tab.id,
            title: tab.title || 'Untitled',
            url: tab.url,
            type: 'tab' as const,
            score: 0.9,
            snippet: tab.url,
          }));

        // 2. Search vector store (HNSW - <70ms)
        let vectorResults: SearchPreviewResult[] = [];
        try {
          // Generate query embedding (would use Rust command in production)
          // For now, use simple text matching on stored embeddings
          const vectorSearchResults = await hnswService.search(
            await generateQueryEmbedding(debouncedQuery),
            5
          );

          vectorResults = vectorSearchResults.map(result => ({
            id: result.id,
            title: result.metadata?.title || result.text.slice(0, 50),
            url: result.metadata?.url,
            type: 'memory' as const,
            score: result.score,
            snippet: result.text.slice(0, 100),
          }));
        } catch (error) {
          console.warn('[RealtimeSearchPreview] Vector search failed', error);
        }

        // 3. Combine and rank results
        const allResults = [...tabResults, ...vectorResults]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5); // Top 5 only

        setResults(allResults);
      } catch (error) {
        console.error('[RealtimeSearchPreview] Search error', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performRealtimeSearch();
  }, [debouncedQuery, isVisible, tabs]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible || results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, results, selectedIndex, onSelect]);

  if (!isVisible || (!loading && results.length === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
      >
        {loading && (
          <div className="p-4 text-center text-slate-400">
            <Sparkles className="mr-2 inline-block animate-pulse" size={16} />
            Searching...
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="py-2">
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`cursor-pointer px-4 py-3 transition-colors ${
                  index === selectedIndex
                    ? 'border-l-2 border-emerald-500 bg-slate-800'
                    : 'hover:bg-slate-800/50'
                }`}
                onClick={() => onSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start gap-3">
                  {result.type === 'tab' ? (
                    <Globe size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
                  ) : result.type === 'memory' ? (
                    <FileText size={16} className="mt-0.5 flex-shrink-0 text-purple-400" />
                  ) : (
                    <Search size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{result.title}</div>
                    {result.snippet && (
                      <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                        {result.snippet}
                      </div>
                    )}
                    {result.url && (
                      <div className="mt-1 truncate text-xs text-slate-500">{result.url}</div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-slate-500">
                    {Math.round(result.score * 100)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Telepathy Upgrade Phase 3: Use cached embeddings with SHA256 + 4-bit quantized model
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const { getOrGenerateEmbedding } = await import('../../services/embedding/embeddingCache');
    // Use 4-bit quantized model (default) with cache
    return await getOrGenerateEmbedding(query, 'nomic-embed-text:4bit');
  } catch (error) {
    console.warn('[RealtimeSearchPreview] Rust embedding failed, using fallback', error);
    // Fallback to simple hash-based vector
    const hash = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
  }
}
