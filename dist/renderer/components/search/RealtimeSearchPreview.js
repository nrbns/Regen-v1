import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Realtime Search Preview - Telepathy Upgrade Phase 1
 * Live top-5 preview under omnibar with 150ms debounce
 * Feels exactly like Perplexity Pro on steroids
 */
import { useState, useEffect } from 'react';
import { Search, Globe, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';
import { hnswService } from '../../services/vector/hnswService';
import { useDebounce } from '../../utils/useDebounce';
import { getQueryPrefetcher } from '../../services/prefetch/queryPrefetcher';
import { isWebMode } from '../../lib/env';
export function RealtimeSearchPreview({ query, onSelect, isVisible }) {
    const [results, setResults] = useState([]);
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
            // Future Enhancement #5: Record query for prefetching
            getQueryPrefetcher().recordQuery(debouncedQuery);
            try {
                // 1. Search tabs (instant, local)
                const tabResults = tabs
                    .filter(tab => {
                    const searchText = `${tab.title} ${tab.url}`.toLowerCase();
                    return searchText.includes(debouncedQuery.toLowerCase());
                })
                    .slice(0, 3)
                    .map(tab => ({
                    id: tab.id,
                    title: tab.title || 'Untitled',
                    url: tab.url,
                    type: 'tab',
                    score: 0.9,
                    snippet: tab.url,
                }));
                // 2. Search vector store (HNSW - <70ms)
                let vectorResults = [];
                try {
                    // Generate query embedding (would use Rust command in production)
                    // For now, use simple text matching on stored embeddings
                    const vectorSearchResults = await hnswService.search(await generateQueryEmbedding(debouncedQuery), 5);
                    vectorResults = vectorSearchResults.map(result => ({
                        id: result.id,
                        title: result.metadata?.title || result.text.slice(0, 50),
                        url: result.metadata?.url,
                        type: 'memory',
                        score: result.score,
                        snippet: result.text.slice(0, 100),
                    }));
                }
                catch (error) {
                    console.warn('[RealtimeSearchPreview] Vector search failed', error);
                }
                // 3. Combine and rank results
                const allResults = [...tabResults, ...vectorResults]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5); // Top 5 only
                setResults(allResults);
            }
            catch (error) {
                console.error('[RealtimeSearchPreview] Search error', error);
                setResults([]);
            }
            finally {
                setLoading(false);
            }
        };
        performRealtimeSearch();
    }, [debouncedQuery, isVisible, tabs]);
    // Keyboard navigation
    useEffect(() => {
        if (!isVisible || results.length === 0)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            }
            else if (e.key === 'Enter' && results[selectedIndex]) {
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
    return (_jsx(AnimatePresence, { children: _jsxs(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl", children: [loading && (_jsxs("div", { className: "p-4 text-center text-slate-400", children: [_jsx(Sparkles, { className: "mr-2 inline-block animate-pulse", size: 16 }), "Searching..."] })), !loading && results.length > 0 && (_jsx("div", { className: "py-2", children: results.map((result, index) => (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: `cursor-pointer px-4 py-3 transition-colors ${index === selectedIndex
                            ? 'border-l-2 border-emerald-500 bg-slate-800'
                            : 'hover:bg-slate-800/50'}`, onClick: () => onSelect(result), onMouseEnter: () => setSelectedIndex(index), children: _jsxs("div", { className: "flex items-start gap-3", children: [result.type === 'tab' ? (_jsx(Globe, { size: 16, className: "mt-0.5 flex-shrink-0 text-blue-400" })) : result.type === 'memory' ? (_jsx(FileText, { size: 16, className: "mt-0.5 flex-shrink-0 text-purple-400" })) : (_jsx(Search, { size: 16, className: "mt-0.5 flex-shrink-0 text-emerald-400" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-sm font-medium text-white", children: result.title }), result.snippet && (_jsx("div", { className: "mt-1 line-clamp-1 text-xs text-slate-400", children: result.snippet })), result.url && (_jsx("div", { className: "mt-1 truncate text-xs text-slate-500", children: result.url }))] }), _jsxs("div", { className: "flex-shrink-0 text-xs text-slate-500", children: [Math.round(result.score * 100), "%"] })] }) }, result.id))) }))] }) }));
}
// Telepathy Upgrade Phase 3: Use cached embeddings with SHA256 + 4-bit quantized model
async function generateQueryEmbedding(query) {
    try {
        const { getOrGenerateEmbedding } = await import('../../services/embedding/embeddingCache');
        // Use 4-bit quantized model (default) with cache
        return await getOrGenerateEmbedding(query, 'nomic-embed-text:4bit');
    }
    catch (error) {
        // Suppress errors in web mode - fallback is expected
        if (!isWebMode()) {
            console.warn('[RealtimeSearchPreview] Rust embedding failed, using fallback', error);
        }
        // Fallback to simple hash-based vector
        const hash = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
    }
}
