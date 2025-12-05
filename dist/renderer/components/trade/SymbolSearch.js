import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { useDebounce } from '../../utils/useDebounce';
import { searchTradingSymbols } from '../../services/tradingSymbols';
import { tradeToResearch } from '../../core/agents/handoff';
import { toast } from 'react-hot-toast';
export default function SymbolSearch({ activeSymbol, recentSymbols, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const debouncedQuery = useDebounce(query, 250);
    useEffect(() => {
        let cancelled = false;
        const runSearch = async () => {
            if (!debouncedQuery.trim()) {
                setResults([]);
                setError(null);
                return;
            }
            setIsSearching(true);
            setError(null);
            try {
                const matches = await searchTradingSymbols(debouncedQuery);
                if (!cancelled) {
                    setResults(matches);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to search symbols');
                    setResults([]);
                }
            }
            finally {
                if (!cancelled) {
                    setIsSearching(false);
                }
            }
        };
        void runSearch();
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);
    const displayRecent = useMemo(() => {
        return recentSymbols
            .filter(symbol => symbol.toLowerCase() !== activeSymbol.toLowerCase())
            .slice(0, 5);
    }, [recentSymbols, activeSymbol]);
    return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-[#090b12] p-4 text-sm text-white shadow-inner shadow-black/40", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { size: 16, className: "text-indigo-400" }), _jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-indigo-200", children: "Symbol search" })] }), activeSymbol && (_jsxs("button", { onClick: async () => {
                            const result = await tradeToResearch(activeSymbol, 'fundamentals and recent news', 'auto');
                            if (result.success) {
                                toast.success(`Researching ${activeSymbol}...`);
                            }
                            else {
                                toast.error(result.error || 'Failed to start research');
                            }
                        }, className: "flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors", title: `Research ${activeSymbol} in Research mode`, children: [_jsx(BookOpen, { size: 12 }), "Research"] }))] }), _jsxs("div", { className: "relative mb-3", children: [_jsx("input", { type: "text", value: query, placeholder: "Search stocks or crypto (e.g. NVDA, BTC)...", onChange: event => setQuery(event.target.value), className: "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60" }), isSearching && (_jsx(Loader2, { size: 16, className: "absolute right-3 top-2.5 animate-spin text-indigo-300" }))] }), error && (_jsxs("div", { className: "mb-3 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200", children: [_jsx(AlertCircle, { size: 14 }), error] })), displayRecent.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-400", children: [_jsx(TrendingUp, { size: 12 }), "Recent symbols"] }), _jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: displayRecent.map(symbol => (_jsx("button", { type: "button", onClick: e => {
                                e.stopImmediatePropagation();
                                e.stopPropagation();
                                onSelect(symbol);
                            }, onMouseDown: e => {
                                e.stopImmediatePropagation();
                                e.stopPropagation();
                            }, className: "rounded-full border border-white/10 px-3 py-1 text-xs text-gray-200 hover:border-indigo-400/60 hover:text-white", style: { zIndex: 10011, isolation: 'isolate' }, children: symbol }, symbol))) })] })), debouncedQuery && (_jsx("div", { className: "space-y-2", children: results.length === 0 && !isSearching && !error ? (_jsx("div", { className: "rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400", children: "No matches found. Try another symbol or exchange." })) : (results.slice(0, 6).map(result => {
                    const isActive = result.symbol.toLowerCase() === activeSymbol.toLowerCase();
                    return (_jsxs("button", { type: "button", onClick: e => {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            onSelect(result.symbol);
                        }, onMouseDown: e => {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                        }, className: `w-full rounded-xl border px-3 py-2 text-left transition ${isActive
                            ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-100'
                            : 'border-white/10 bg-white/5 hover:border-indigo-400/50'}`, style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsxs("div", { className: "flex items-center justify-between text-sm font-semibold", children: [_jsx("span", { children: result.symbol }), _jsx("span", { className: "text-xs uppercase text-gray-400", children: result.type })] }), _jsx("p", { className: "truncate text-xs text-gray-400", children: result.name }), _jsxs("p", { className: "text-[11px] text-gray-500", children: [result.exchange, result.region ? ` • ${result.region}` : '', result.currency ? ` • ${result.currency}` : ''] })] }, result.symbol));
                })) }))] }));
}
