import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
export default function TradesTape({ trades, maxVisible = 20, symbol }) {
    const [visibleTrades, setVisibleTrades] = useState([]);
    const containerRef = useRef(null);
    useEffect(() => {
        // Show most recent trades
        const recent = trades.slice(-maxVisible).reverse();
        setVisibleTrades(recent);
    }, [trades, maxVisible]);
    return (_jsxs("div", { className: "overflow-hidden rounded-lg border border-gray-700 bg-gray-900", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-2", children: [_jsx("h3", { className: "text-xs font-semibold text-gray-300", children: "Recent Trades" }), symbol && _jsx("span", { className: "text-xs text-gray-400", children: symbol })] }), _jsx("div", { ref: containerRef, className: "scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 h-48 overflow-y-auto", children: _jsx("div", { className: "divide-y divide-gray-800", children: _jsx(AnimatePresence, { initial: false, children: visibleTrades.length > 0 ? (visibleTrades.map(trade => {
                            const isBuy = trade.side === 'buy';
                            return (_jsxs(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, x: -20 }, className: `flex items-center justify-between px-3 py-2 text-xs transition-colors ${isBuy ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [isBuy ? (_jsx(ArrowUp, { size: 12, className: "text-green-400" })) : (_jsx(ArrowDown, { size: 12, className: "text-red-400" })), _jsx("span", { className: `font-medium ${isBuy ? 'text-green-400' : 'text-red-400'}`, children: trade.price.toFixed(2) })] }), _jsxs("div", { className: "flex items-center gap-3 text-gray-400", children: [_jsx("span", { children: trade.quantity.toLocaleString() }), _jsx("span", { className: "text-[10px] text-gray-500", children: new Date(trade.timestamp).toLocaleTimeString() })] })] }, trade.id));
                        })) : (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "No recent trades" })) }) }) })] }));
}
