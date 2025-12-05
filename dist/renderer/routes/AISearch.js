import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * AI Search Page - Perplexity-style interface
 * Real-time AI-powered search with streaming results
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, ExternalLink, Copy, CheckCircle2, Loader2, ArrowUp, Globe, Link2, } from 'lucide-react';
export default function AISearch() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [answer, setAnswer] = useState('');
    const [sources, setSources] = useState([]);
    const [streaming, setStreaming] = useState(false);
    const [copied, setCopied] = useState(false);
    const answerRef = useRef(null);
    const searchInputRef = useRef(null);
    // Focus search input on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);
    // Auto-scroll answer as it streams
    useEffect(() => {
        if (answerRef.current && streaming) {
            answerRef.current.scrollTop = answerRef.current.scrollHeight;
        }
    }, [answer, streaming]);
    const handleSearch = useCallback(async (searchQuery) => {
        if (!searchQuery.trim())
            return;
        setIsSearching(true);
        setStreaming(true);
        setAnswer('');
        setSources([]);
        try {
            // Call scraper API for research query
            const response = await fetch('http://localhost:4000/api/scraper/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: searchQuery,
                    urls: [], // Will be populated by search results
                    options: {
                        maxLength: 1000,
                        includeSources: true,
                    },
                }),
            });
            if (!response.ok) {
                throw new Error('Search failed');
            }
            const data = await response.json();
            if (data.success && data.synthesized) {
                // Stream the answer (simulate streaming for now)
                const answerText = data.synthesized.answer || '';
                const words = answerText.split(' ');
                for (let i = 0; i < words.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 30));
                    setAnswer(words.slice(0, i + 1).join(' '));
                }
                // Set sources
                if (data.synthesized.sources) {
                    setSources(data.synthesized.sources.map((source, index) => ({
                        id: `source-${index}`,
                        url: source.url,
                        title: source.title || new URL(source.url).hostname,
                        snippet: source.snippet || '',
                        domain: new URL(source.url).hostname,
                        relevance: 1 - index * 0.1,
                    })));
                }
            }
        }
        catch (error) {
            console.error('Search error:', error);
            setAnswer('Sorry, I encountered an error while searching. Please try again.');
        }
        finally {
            setIsSearching(false);
            setStreaming(false);
        }
    }, []);
    const handleSubmit = (e) => {
        e.preventDefault();
        handleSearch(query);
    };
    const handleCopy = async () => {
        if (answer) {
            await navigator.clipboard.writeText(answer);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    const handleSourceClick = (url) => {
        window.open(url, '_blank');
    };
    return (_jsxs("div", { className: "flex h-full w-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950", children: [_jsx("div", { className: "border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm", children: _jsx("div", { className: "mx-auto max-w-4xl px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Sparkles, { className: "h-6 w-6 text-blue-400" }), _jsx("h1", { className: "text-xl font-semibold text-white", children: "AI Search" }), _jsx("span", { className: "text-xs text-slate-400", children: "Powered by Regen AI" })] }) }) }), _jsx("div", { className: "border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-sm", children: _jsx("div", { className: "mx-auto max-w-4xl px-6 py-6", children: _jsx("form", { onSubmit: handleSubmit, className: "relative", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" }), _jsx("input", { ref: searchInputRef, type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Ask anything...", className: "w-full rounded-2xl border border-slate-700/50 bg-slate-800/50 py-4 pl-12 pr-14 text-white placeholder-slate-400 backdrop-blur-sm transition-all focus:border-blue-500/50 focus:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20", disabled: isSearching }), isSearching && (_jsx(Loader2, { className: "absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-blue-400" })), !isSearching && query && (_jsx(motion.button, { type: "submit", whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500", children: _jsx(ArrowUp, { className: "h-4 w-4" }) }))] }) }) }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsxs("div", { className: "mx-auto max-w-4xl px-6 py-8", children: [!answer && !isSearching && (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "mb-6", children: _jsx(Sparkles, { className: "mx-auto h-16 w-16 text-blue-400/50" }) }), _jsx("h2", { className: "mb-2 text-2xl font-semibold text-white", children: "Ask me anything" }), _jsx("p", { className: "text-slate-400", children: "Get instant, AI-powered answers with sources" })] })), isSearching && !answer && (_jsxs("div", { className: "flex flex-col items-center justify-center py-20", children: [_jsx(Loader2, { className: "mb-4 h-8 w-8 animate-spin text-blue-400" }), _jsx("p", { className: "text-slate-400", children: "Searching and synthesizing..." })] })), answer && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "space-y-6", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6 backdrop-blur-sm", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-5 w-5 text-blue-400" }), _jsx("h2", { className: "text-lg font-semibold text-white", children: "Answer" }), streaming && (_jsx("span", { className: "text-xs text-slate-400", children: "Streaming..." }))] }), _jsx("button", { onClick: handleCopy, className: "flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800", children: copied ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "h-4 w-4 text-green-400" }), _jsx("span", { children: "Copied" })] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "h-4 w-4" }), _jsx("span", { children: "Copy" })] })) })] }), _jsxs("div", { ref: answerRef, className: "prose prose-invert max-w-none text-slate-200 prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white", children: [_jsx("p", { className: "whitespace-pre-wrap leading-relaxed", children: answer }), streaming && (_jsx("span", { className: "inline-block h-4 w-1 animate-pulse bg-blue-400" }))] })] }), sources.length > 0 && (_jsxs("div", { className: "rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6 backdrop-blur-sm", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx(Link2, { className: "h-5 w-5 text-blue-400" }), _jsxs("h2", { className: "text-lg font-semibold text-white", children: ["Sources (", sources.length, ")"] })] }), _jsx("div", { className: "space-y-3", children: sources.map((source, index) => (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { delay: index * 0.1 }, className: "group cursor-pointer rounded-lg border border-slate-800/50 bg-slate-800/30 p-4 transition-all hover:border-blue-500/50 hover:bg-slate-800/50", onClick: () => handleSourceClick(source.url), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-900/50", children: _jsx(Globe, { className: "h-5 w-5 text-slate-400" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("h3", { className: "truncate font-medium text-white", children: source.title }), _jsx(ExternalLink, { className: "h-4 w-4 flex-shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" })] }), _jsx("p", { className: "mb-2 line-clamp-2 text-sm text-slate-400", children: source.snippet || source.url }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-slate-500", children: source.domain }), source.relevance && (_jsxs("span", { className: "text-xs text-blue-400", children: [Math.round(source.relevance * 100), "% relevant"] }))] })] })] }) }, source.id))) })] })), _jsxs("div", { className: "rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6 backdrop-blur-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold text-white", children: "Related Searches" }), _jsx("div", { className: "flex flex-wrap gap-2", children: [
                                                'More about this topic',
                                                'Related research',
                                                'Similar questions',
                                            ].map((suggestion, index) => (_jsx("button", { onClick: () => {
                                                    setQuery(suggestion);
                                                    handleSearch(suggestion);
                                                }, className: "rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-slate-800", children: suggestion }, index))) })] })] }))] }) })] }));
}
