import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Search, Command, MousePointerClick, Sparkles } from 'lucide-react';
// Phase 1, Day 5: Enhanced shortcuts with voice commands
const SHORTCUT_GROUPS = [
    {
        id: 'voice',
        title: 'Voice Commands (WISPR)',
        shortcuts: [
            { combo: 'Ctrl/Cmd + Space', action: 'Activate WISPR voice assistant', context: 'Global' },
            { combo: 'Ctrl/Cmd + Shift + Space', action: 'Wake WISPR from anywhere', context: 'Global' },
            { combo: 'Voice: "Research [topic]"', action: 'Start research in current mode', context: 'Voice' },
            { combo: 'Voice: "Nifty kharido 50"', action: 'Place trade order (Hindi/English)', context: 'Voice' },
        ],
    },
    {
        id: 'navigation',
        title: 'Global navigation',
        shortcuts: [
            { combo: 'Ctrl/Cmd + L', action: 'Focus omnibox', context: 'Global' },
            { combo: 'Ctrl/Cmd + K', action: 'Command palette / AI actions', context: 'Global' },
            { combo: 'Ctrl/Cmd + T', action: 'Open new tab', context: 'Tabs' },
            { combo: 'Ctrl/Cmd + W', action: 'Close current tab', context: 'Tabs' },
            { combo: 'Ctrl/Cmd + Shift + T', action: 'Reopen last closed tab', context: 'Tabs' },
            { combo: 'Ctrl/Cmd + Tab', action: 'Cycle tabs in current mode', context: 'Tabs' },
        ],
    },
    {
        id: 'research',
        title: 'Research mode',
        shortcuts: [
            { combo: 'Ctrl/Cmd + Shift + G', action: 'Open tab DNA graph', context: 'Research' },
            { combo: 'Ctrl/Cmd + Shift + H', action: 'Capture highlight clipper', context: 'Research' },
            { combo: 'Ctrl/Cmd + Shift + M', action: 'Toggle memory sidebar', context: 'Research' },
        ],
    },
    {
        id: 'trade',
        title: 'Trade mode',
        shortcuts: [
            { combo: 'Shift + 1..9', action: 'Toggle indicator presets', context: 'Trade' },
            { combo: 'Ctrl/Cmd + Shift + R', action: 'Refresh TradingView feed', context: 'Trade' },
            { combo: 'Ctrl/Cmd + Enter', action: 'Submit staged order', context: 'Trade' },
        ],
    },
    {
        id: 'system',
        title: 'System & overlays',
        shortcuts: [
            { combo: 'Esc', action: 'Dismiss active overlay', context: 'Global' },
            { combo: 'Ctrl/Cmd + Shift + A', action: 'Toggle Agent console', context: 'Global' },
            { combo: 'F11', action: 'Toggle full-screen game mode', context: 'Games' },
        ],
    },
];
export function ShortcutsHelp() {
    const [query, setQuery] = useState('');
    const filteredGroups = useMemo(() => {
        if (!query.trim()) {
            return SHORTCUT_GROUPS;
        }
        const lower = query.toLowerCase();
        return SHORTCUT_GROUPS.map(group => ({
            ...group,
            shortcuts: group.shortcuts.filter(shortcut => shortcut.combo.toLowerCase().includes(lower) ||
                shortcut.action.toLowerCase().includes(lower) ||
                shortcut.context.toLowerCase().includes(lower)),
        })).filter(group => group.shortcuts.length > 0);
    }, [query]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-2", children: [_jsxs("h1", { className: "flex items-center gap-2 text-2xl font-semibold text-white", children: [_jsx(Command, { size: 18, className: "text-purple-300" }), "Keyboard reference"] }), _jsx("p", { className: "text-sm text-slate-400", children: "Every shortcut in Regen grouped by context. Type to filter or scan per-mode highlights." }), _jsxs("div", { className: "relative mt-4", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" }), _jsx("input", { value: query, onChange: event => setQuery(event.target.value), placeholder: "Filter shortcuts by key, action, or context", className: "w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/60" })] })] }), _jsxs("div", { className: "grid gap-4", children: [filteredGroups.map(group => (_jsxs("section", { className: "rounded-3xl border border-slate-900/70 bg-slate-950/60 p-4 shadow-inner shadow-black/30", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("div", { children: _jsx("h2", { className: "text-sm font-semibold uppercase tracking-[0.25em] text-white", children: group.title }) }), group.id === 'research' && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200", children: [_jsx(Sparkles, { size: 12 }), "AI aware"] }))] }), _jsxs("div", { className: "space-y-2", children: [group.shortcuts.map(shortcut => (_jsxs("div", { className: "border-white/8 flex items-center justify-between rounded-2xl border bg-white/5 px-3 py-2 text-sm text-slate-200", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("kbd", { className: "rounded-xl border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold tracking-wide text-white", children: shortcut.combo }), _jsx("span", { children: shortcut.action })] }), _jsx("span", { className: "text-xs uppercase tracking-[0.3em] text-slate-500", children: shortcut.context })] }, `${group.id}-${shortcut.combo}`))), group.shortcuts.length === 0 && (_jsxs("div", { className: "rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500", children: ["No shortcuts match \u201C", query, "\u201D in this group."] }))] })] }, group.id))), filteredGroups.length === 0 && (_jsxs("div", { className: "rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-500", children: ["No shortcuts match \u201C", query, "\u201D. Try searching \u201Ctab\u201D, \u201Cagent\u201D, or \u201Cgames\u201D."] }))] }), _jsxs("div", { className: "flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400", children: [_jsx(MousePointerClick, { size: 14, className: "mt-0.5 text-purple-300" }), _jsxs("span", { children: ["Tip: Hold ", _jsx("strong", { children: "Ctrl/Cmd" }), " while hovering UI buttons to see contextual shortcuts in-line. This onboarding helper is also available from", ' ', _jsx("strong", { children: "Settings \u2192 Shortcuts" }), " anytime."] })] })] }));
}
