import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Shield, RefreshCw, Plus } from 'lucide-react';
import { fetchTradeQuote } from '../../core/trade/dataService';
import { useTradeStore } from '../../state/tradeStore';
export function TradeSidebar({ open, onClose }) {
    const { activeSymbol, setActiveSymbol, watchlist, addToWatchlist, quotes, updateQuote } = useTradeStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newSymbol, setNewSymbol] = useState('');
    useEffect(() => {
        if (!open)
            return;
        let cancelled = false;
        const loadQuote = async () => {
            setLoading(true);
            setError(null);
            try {
                const quote = await fetchTradeQuote(activeSymbol);
                if (!cancelled) {
                    updateQuote(activeSymbol, quote);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load quote');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        loadQuote();
        // Real-time updates: Poll every 5 seconds for active trading
        const interval = setInterval(loadQuote, 5000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [activeSymbol, open, updateQuote]);
    const quote = quotes[activeSymbol];
    const changePositive = (quote?.change || 0) >= 0;
    return (_jsxs(_Fragment, { children: [open && (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-30 sm:hidden", onClick: onClose, "aria-hidden": "true" })), _jsxs("div", { className: `fixed right-0 top-0 bottom-0 w-96 max-w-[90vw] sm:max-w-full bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 z-40 transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`, onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Shield, { size: 18, className: "text-blue-400" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Trade Mode" }), _jsx("p", { className: "text-xs text-gray-400", children: "Ghost + VPN enabled for market data" })] })] }), _jsx("button", { onClick: onClose, className: "rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors", "aria-label": "Close trade sidebar", children: "\u2715" })] }), _jsxs("div", { className: "p-4 space-y-4 overflow-y-auto h-full", children: [_jsxs("div", { className: "bg-gray-800/50 rounded-xl border border-gray-700/50 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase text-gray-400 tracking-wide", children: "Active Symbol" }), _jsx("div", { className: "text-2xl font-bold text-white", children: activeSymbol }), quote && (_jsxs("div", { className: "flex items-center gap-2 mt-2", children: [changePositive ? (_jsx(TrendingUp, { size: 16, className: "text-green-400" })) : (_jsx(TrendingDown, { size: 16, className: "text-red-400" })), _jsxs("span", { className: changePositive ? 'text-green-400' : 'text-red-400', children: [quote.change.toFixed(2), " (", quote.changePercent.toFixed(2), "%)"] })] }))] }), _jsx("button", { onClick: () => quotes[activeSymbol] && updateQuote(activeSymbol, quotes[activeSymbol]), className: "p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700", title: "Refresh quote", children: _jsx(RefreshCw, { size: 16 }) })] }), _jsx("div", { className: "mt-4 h-24", children: quote ? (_jsx(Sparkline, { values: quote.sparkline, positive: changePositive })) : (_jsx("div", { className: "flex items-center justify-center h-full text-gray-500 text-sm", children: loading ? 'Loading...' : 'No data' })) })] }), _jsxs("div", { className: "bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-gray-200", children: "Watchlist" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { value: newSymbol, onChange: e => setNewSymbol(e.target.value.toUpperCase()), placeholder: "Add symbol", className: "bg-gray-900 border border-gray-700 text-sm text-white rounded px-2 py-1 w-24" }), _jsx("button", { onClick: () => {
                                                            if (!newSymbol)
                                                                return;
                                                            addToWatchlist(newSymbol);
                                                            setActiveSymbol(newSymbol);
                                                            setNewSymbol('');
                                                        }, className: "p-1.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30", children: _jsx(Plus, { size: 14 }) })] })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: watchlist.map(symbol => {
                                            const quote = quotes[symbol];
                                            const positive = quote ? quote.change >= 0 : true;
                                            return (_jsx("button", { onClick: () => setActiveSymbol(symbol), className: `px-3 py-1.5 rounded-lg border text-sm transition-colors ${symbol === activeSymbol
                                                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                                                    : 'border-gray-700 text-gray-300 hover:border-blue-500/40'}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { children: symbol }), quote && (_jsxs("span", { className: positive ? 'text-green-400' : 'text-red-400', children: [positive ? '+' : '', quote.changePercent.toFixed(1), "%"] }))] }) }, symbol));
                                        }) })] }), quote && (_jsxs("div", { className: "bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-gray-200", children: "Sentiment" }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${quote.sentiment === 'bullish'
                                                    ? 'bg-green-500/20 text-green-300'
                                                    : quote.sentiment === 'bearish'
                                                        ? 'bg-red-500/20 text-red-300'
                                                        : 'bg-gray-700 text-gray-300'}`, children: quote.sentiment })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm text-gray-300", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500", children: "Price" }), _jsxs("div", { className: "text-lg font-semibold text-white", children: ["$", quote.price.toFixed(2)] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500", children: "Volume" }), _jsx("div", { children: quote.volume?.toLocaleString() || '—' })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500", children: "Prev Close" }), _jsxs("div", { children: ["$", quote.previousClose?.toFixed(2) ?? '—'] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500", children: "Updated" }), _jsx("div", { children: new Date(quote.updatedAt).toLocaleTimeString() })] })] })] })), error && _jsx("div", { className: "text-sm text-red-400", children: error })] })] })] }));
}
function Sparkline({ values, positive }) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    return (_jsx("div", { className: "h-full w-full flex items-end gap-[2px]", children: values.map((value, idx) => {
            const heightPercent = ((value - min) / range) * 100;
            return (_jsx("div", { className: `flex-1 rounded-sm ${positive ? 'bg-green-500/60' : 'bg-red-500/60'}`, style: { height: `${heightPercent}%` } }, idx));
        }) }));
}
