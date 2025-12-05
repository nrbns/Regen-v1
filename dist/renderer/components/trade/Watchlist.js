import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X, RefreshCcw, AlertCircle, Star } from 'lucide-react';
import { searchTradingSymbols } from '../../services/tradingSymbols';
import { useWatchlistStore } from '../../state/watchlistStore';
import { ipc } from '../../lib/ipc-typed';
export default function Watchlist({ activeSymbol, onSelectSymbol }) {
    const { symbols, addSymbol, removeSymbol, updateMeta } = useWatchlistStore();
    const [input, setInput] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState(null);
    const [quotes, setQuotes] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshQuotes = useCallback(async () => {
        if (symbols.length === 0)
            return;
        setIsRefreshing(true);
        try {
            const results = await Promise.all(symbols.map(entry => ipc.trade.getQuote(entry.symbol).catch(() => null)));
            setQuotes(prev => {
                const next = { ...prev };
                results.forEach(quote => {
                    if (!quote)
                        return;
                    const key = quote.symbol.toUpperCase();
                    const previous = prev[key];
                    const change = previous ? quote.last - previous.price : 0;
                    const changePercent = previous && previous.price !== 0 ? (change / previous.price) * 100 : 0;
                    next[key] = {
                        price: quote.last,
                        change,
                        changePercent,
                        volume: quote.volume,
                        timestamp: quote.timestamp,
                    };
                });
                return next;
            });
            setError(null);
        }
        catch (err) {
            console.warn('[Watchlist] Failed to refresh quotes:', err);
            setError('Failed to refresh quotes');
        }
        finally {
            setIsRefreshing(false);
        }
    }, [symbols]);
    useEffect(() => {
        if (symbols.length === 0)
            return undefined;
        let cancelled = false;
        const run = async () => {
            if (cancelled)
                return;
            await refreshQuotes();
        };
        void run();
        const interval = setInterval(run, 15000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [symbols, refreshQuotes]);
    useEffect(() => {
        if (symbols.length === 0) {
            setQuotes({});
            setError(null);
        }
    }, [symbols.length]);
    const handleAddSymbol = async (event) => {
        event.preventDefault();
        if (!input.trim())
            return;
        setIsAdding(true);
        setError(null);
        try {
            const matches = await searchTradingSymbols(input.trim());
            const match = matches?.[0];
            const entry = {
                symbol: (match?.symbol || input.trim()).toUpperCase(),
                name: match?.name,
                exchange: match?.exchange,
                type: match?.type,
                addedAt: Date.now(),
            };
            addSymbol(entry);
            if (match?.name) {
                updateMeta(entry.symbol, { name: match.name, exchange: match.exchange, type: match.type });
            }
            setInput('');
        }
        catch (err) {
            console.error('[Watchlist] Failed to add symbol:', err);
            setError('Could not find that symbol. Try its full ticker.');
        }
        finally {
            setIsAdding(false);
        }
    };
    const displaySymbols = useMemo(() => {
        return symbols.slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
    }, [symbols]);
    return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-[#080a11] p-4 text-white shadow-inner shadow-black/40", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Star, { size: 16, className: "text-amber-400" }), _jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-amber-200", children: "Watchlist" }), _jsxs("span", { className: "text-[11px] text-gray-500", children: ["(", symbols.length, ")"] })] }), _jsxs("button", { type: "button", onClick: e => {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            setInput(activeSymbol);
                        }, onMouseDown: e => {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                        }, className: "text-xs text-indigo-300 hover:text-white", style: { zIndex: 10011, isolation: 'isolate' }, children: ["Track ", activeSymbol] })] }), _jsxs("form", { onSubmit: e => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleAddSymbol(e);
                }, className: "mb-3 flex gap-2", onMouseDown: e => {
                    // Don't interfere with form submission
                    const target = e.target;
                    if (target.closest('button[type="submit"]') || target.closest('input')) {
                        return;
                    }
                }, onClick: e => {
                    // Don't interfere with form submission
                    const target = e.target;
                    if (target.closest('button[type="submit"]') || target.closest('input')) {
                        return;
                    }
                }, children: [_jsx("div", { className: "relative flex-1", children: _jsx("input", { type: "text", value: input, placeholder: "Add symbol (AAPL, BTC-USD)\u2026", onChange: event => setInput(event.target.value), onKeyDown: e => {
                                if (e.key === 'Enter' && !isAdding && input.trim()) {
                                    e.preventDefault();
                                    void handleAddSymbol(e);
                                }
                            }, className: "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60" }) }), _jsxs("button", { type: "submit", disabled: isAdding || !input.trim(), onClick: e => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            if (!isAdding && input.trim()) {
                                void handleAddSymbol(e);
                            }
                        }, onMouseDown: e => {
                            // Allow mousedown to proceed normally for form submission
                            e.stopPropagation();
                        }, className: "inline-flex items-center gap-1 rounded-xl bg-indigo-500/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed", style: { zIndex: 10011, isolation: 'isolate', pointerEvents: 'auto' }, children: [_jsx(Plus, { size: 14 }), "Add"] })] }), error && (_jsxs("div", { className: "mb-3 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200", children: [_jsx(AlertCircle, { size: 14 }), error] })), symbols.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-gray-400", children: [_jsx("p", { children: "No symbols yet." }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Add stocks or crypto you want to track." })] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500", children: [_jsx("span", { children: "Symbol" }), _jsxs("div", { className: "flex gap-8 pr-4", children: [_jsx("span", { children: "Price" }), _jsx("span", { children: "24h \u0394" })] })] }), _jsx("div", { className: "divide-y divide-white/5 rounded-xl border border-white/10", children: displaySymbols.map(entry => {
                            const symbolKey = entry.symbol.toUpperCase();
                            const quote = quotes[symbolKey];
                            const isActive = symbolKey === activeSymbol.toUpperCase();
                            const changePositive = (quote?.change ?? 0) >= 0;
                            return (_jsxs("button", { type: "button", onClick: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                    onSelectSymbol(entry.symbol);
                                }, onMouseDown: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                }, className: `flex w-full items-center justify-between px-3 py-2 text-left transition ${isActive ? 'bg-indigo-500/10 text-white' : 'hover:bg-white/5'}`, style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-semibold", children: entry.symbol }), entry.type && (_jsx("span", { className: "rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-gray-400", children: entry.type }))] }), _jsxs("p", { className: "text-xs text-gray-400", children: [entry.name || '—', entry.exchange ? ` • ${entry.exchange}` : ''] })] }), _jsxs("div", { className: "flex items-center gap-8 text-right", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: quote?.price ? `$${quote.price.toFixed(2)}` : '—' }), _jsxs("p", { className: "text-[11px] text-gray-500", children: ["Vol ", quote?.volume ? abbreviateNumber(quote.volume) : '—'] })] }), _jsx("div", { className: "text-sm font-semibold", children: quote ? (_jsxs("span", { className: changePositive ? 'text-green-400' : 'text-red-400', children: [changePositive ? '+' : '', quote.change.toFixed(2), " (", quote.changePercent.toFixed(2), "%)"] })) : (_jsx("span", { className: "text-gray-500", children: "\u2014" })) }), _jsx("button", { type: "button", onClick: event => {
                                                    event.stopImmediatePropagation();
                                                    event.stopPropagation();
                                                    removeSymbol(entry.symbol);
                                                }, onMouseDown: e => {
                                                    e.stopImmediatePropagation();
                                                    e.stopPropagation();
                                                }, className: "rounded-full p-1 text-gray-500 hover:text-white", style: { zIndex: 10012, isolation: 'isolate' }, title: "Remove", children: _jsx(X, { size: 14 }) })] })] }, entry.symbol));
                        }) }), _jsxs("button", { type: "button", onClick: e => {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            void refreshQuotes();
                        }, onMouseDown: e => {
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                        }, disabled: isRefreshing, className: "flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-300 hover:border-white/40 hover:text-white disabled:opacity-50", style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(RefreshCcw, { size: 14, className: isRefreshing ? 'animate-spin' : '' }), "Refresh quotes"] })] }))] }));
}
function abbreviateNumber(value) {
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toString();
}
