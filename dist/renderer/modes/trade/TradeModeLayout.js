import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Trade Mode Layout - Tier 3 Pillar 2
 * Multi-panel layout for trading workflows
 */
import { useState } from 'react';
import { Newspaper, Sparkles, BarChart3 } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
export function TradeModeLayout() {
    const [activePanel, setActivePanel] = useState('chart');
    const mode = useAppStore(state => state.mode);
    if (mode !== 'Trade') {
        return null;
    }
    return (_jsxs("div", { className: "flex h-full w-full bg-slate-950", children: [_jsxs("div", { className: "flex-1 flex flex-col border-r border-slate-800", children: [_jsxs("div", { className: "flex items-center gap-2 p-4 border-b border-slate-800", children: [_jsx(BarChart3, { size: 20, className: "text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold text-white", children: "Chart" })] }), _jsx("div", { className: "flex-1 p-4", children: _jsx("div", { className: "h-full rounded-lg border border-slate-800 bg-slate-900/50 flex items-center justify-center text-slate-400", children: "Chart view (TradingView integration coming soon)" }) })] }), _jsxs("div", { className: "w-80 flex flex-col border-l border-slate-800", children: [_jsxs("div", { className: "flex border-b border-slate-800", children: [_jsxs("button", { onClick: () => setActivePanel('news'), className: `flex-1 px-4 py-3 text-sm font-medium transition-colors ${activePanel === 'news'
                                    ? 'text-purple-300 border-b-2 border-purple-500 bg-slate-900'
                                    : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(Newspaper, { size: 16, className: "inline mr-2" }), "News"] }), _jsxs("button", { onClick: () => setActivePanel('agent'), className: `flex-1 px-4 py-3 text-sm font-medium transition-colors ${activePanel === 'agent'
                                    ? 'text-purple-300 border-b-2 border-purple-500 bg-slate-900'
                                    : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(Sparkles, { size: 16, className: "inline mr-2" }), "Agent"] })] }), activePanel === 'news' && (_jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx("div", { className: "space-y-3", children: _jsx("div", { className: "p-3 rounded-lg border border-slate-800 bg-slate-900/50", children: _jsx("p", { className: "text-sm text-slate-300", children: "Market news feed coming soon" }) }) }) })), activePanel === 'agent' && (_jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx("div", { className: "space-y-3", children: _jsxs("div", { className: "p-3 rounded-lg border border-slate-800 bg-slate-900/50", children: [_jsx("p", { className: "text-sm text-slate-300 mb-2", children: "Ask OmniAgent:" }), _jsxs("ul", { className: "text-xs text-slate-400 space-y-1", children: [_jsx("li", { children: "\u2022 \"Explain today's move for BTC\"" }), _jsx("li", { children: "\u2022 \"Summarize key macro news\"" }), _jsx("li", { children: "\u2022 \"What's the sentiment on this symbol?\"" })] })] }) }) }))] })] }));
}
