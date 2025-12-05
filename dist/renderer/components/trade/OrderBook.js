import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
export default function OrderBook({ bids, asks, maxDepth = 10, onPriceClick }) {
    const displayBids = bids.slice(0, maxDepth).reverse();
    const displayAsks = asks.slice(0, maxDepth);
    // Calculate cumulative volumes
    let bidCumulative = 0;
    const bidsWithCumulative = displayBids.map(bid => {
        bidCumulative += bid.quantity;
        return { ...bid, cumulative: bidCumulative };
    });
    let askCumulative = 0;
    const asksWithCumulative = displayAsks.map(ask => {
        askCumulative += ask.quantity;
        return { ...ask, cumulative: askCumulative };
    });
    const maxCumulative = Math.max(...bidsWithCumulative.map(b => b.cumulative || 0), ...asksWithCumulative.map(a => a.cumulative || 0));
    return (_jsxs("div", { className: "overflow-hidden rounded-lg border border-gray-700 bg-gray-900", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-3", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-300", children: "Order Book" }), _jsx("div", { className: "flex items-center gap-2 text-xs text-gray-400", children: _jsxs("span", { children: ["Top ", maxDepth] }) })] }), _jsxs("div", { className: "grid grid-cols-2 divide-x divide-gray-700", children: [_jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-gray-700 bg-red-900/20 p-2", children: [_jsx(TrendingUp, { size: 14, className: "text-red-400" }), _jsx("span", { className: "text-xs font-semibold text-red-400", children: "Asks (Sell)" })] }), _jsx("div", { className: "space-y-0.5 p-2", children: displayAsks.length > 0 ? (asksWithCumulative.map((ask, idx) => {
                                    const widthPercent = ((ask.cumulative || 0) / maxCumulative) * 100;
                                    return (_jsxs(motion.button, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, onClick: () => onPriceClick?.(ask.price, 'sell'), className: "group relative flex w-full items-center justify-between rounded px-2 py-1 transition-colors hover:bg-red-900/20", children: [_jsx("div", { className: "absolute bottom-0 left-0 top-0 rounded bg-red-900/20", style: { width: `${widthPercent}%` } }), _jsxs("div", { className: "relative z-10 flex w-full items-center justify-between text-xs", children: [_jsx("span", { className: "font-medium text-red-400", children: ask.price.toFixed(2) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-gray-400", children: ask.quantity.toLocaleString() }), _jsx("span", { className: "text-[10px] text-gray-500", children: ask.cumulative?.toLocaleString() })] })] })] }, `ask-${idx}`));
                                })) : (_jsx("div", { className: "py-4 text-center text-xs text-gray-500", children: "No asks" })) })] }), _jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-gray-700 bg-green-900/20 p-2", children: [_jsx(TrendingDown, { size: 14, className: "text-green-400" }), _jsx("span", { className: "text-xs font-semibold text-green-400", children: "Bids (Buy)" })] }), _jsx("div", { className: "space-y-0.5 p-2", children: displayBids.length > 0 ? (bidsWithCumulative.map((bid, idx) => {
                                    const widthPercent = ((bid.cumulative || 0) / maxCumulative) * 100;
                                    return (_jsxs(motion.button, { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, onClick: () => onPriceClick?.(bid.price, 'buy'), className: "group relative flex w-full items-center justify-between rounded px-2 py-1 transition-colors hover:bg-green-900/20", children: [_jsx("div", { className: "absolute bottom-0 right-0 top-0 rounded bg-green-900/20", style: { width: `${widthPercent}%` } }), _jsxs("div", { className: "relative z-10 flex w-full items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-[10px] text-gray-500", children: bid.cumulative?.toLocaleString() }), _jsx("span", { className: "text-gray-400", children: bid.quantity.toLocaleString() })] }), _jsx("span", { className: "font-medium text-green-400", children: bid.price.toFixed(2) })] })] }, `bid-${idx}`));
                                })) : (_jsx("div", { className: "py-4 text-center text-xs text-gray-500", children: "No bids" })) })] })] }), displayAsks.length > 0 && displayBids.length > 0 && (_jsx("div", { className: "border-t border-gray-700 bg-gray-800/30 p-2", children: _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-gray-400", children: "Spread" }), _jsxs("span", { className: "font-semibold text-yellow-400", children: [(displayAsks[0].price - displayBids[0].price).toFixed(2), " (", (((displayAsks[0].price - displayBids[0].price) / displayBids[0].price) *
                                    100).toFixed(3), "%)"] })] }) }))] }));
}
