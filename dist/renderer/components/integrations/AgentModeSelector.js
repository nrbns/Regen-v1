import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Agent Mode Selector Component
 * Integrates multi-agent system into UI
 */
import { useState, useEffect } from 'react';
import { multiAgentSystem } from '../../core/agents/multiAgentSystem';
import { Sparkles, TrendingUp, Code, FileText, Workflow } from 'lucide-react';
const AGENT_MODES = [
    {
        id: 'trade',
        label: 'Trade',
        icon: TrendingUp,
        description: 'Market analysis, signals, order execution',
    },
    {
        id: 'research',
        label: 'Research',
        icon: Sparkles,
        description: 'Multi-source search, citations, verification',
    },
    {
        id: 'dev',
        label: 'Dev',
        icon: Code,
        description: 'Code extraction, auto-debug, profiling',
    },
    {
        id: 'document',
        label: 'Document',
        icon: FileText,
        description: 'PDF/Doc insights, table extraction',
    },
    {
        id: 'workflow',
        label: 'Workflow',
        icon: Workflow,
        description: 'Arc-like automated workflows',
    },
];
export function AgentModeSelector({ onAgentSelect, defaultMode = 'research', }) {
    const [selectedMode, setSelectedMode] = useState(defaultMode);
    const [capabilities, setCapabilities] = useState([]);
    useEffect(() => {
        const caps = multiAgentSystem.getCapabilities(selectedMode, {
            mode: selectedMode,
        });
        setCapabilities(caps);
        onAgentSelect?.(selectedMode, caps);
    }, [selectedMode, onAgentSelect]);
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: AGENT_MODES.map(mode => {
                    const Icon = mode.icon;
                    const isSelected = selectedMode === mode.id;
                    return (_jsxs("button", { onClick: () => setSelectedMode(mode.id), className: `flex items-center gap-2 rounded-lg border px-4 py-2 transition-all ${isSelected
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'} `, children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("span", { className: "font-medium", children: mode.label })] }, mode.id));
                }) }), capabilities.length > 0 && (_jsxs("div", { className: "rounded-lg bg-neutral-800/50 p-4", children: [_jsx("h3", { className: "mb-2 text-sm font-semibold text-neutral-300", children: "Capabilities" }), _jsx("ul", { className: "flex flex-wrap gap-2", children: capabilities.map(cap => (_jsx("li", { className: "rounded-full bg-neutral-700/50 px-3 py-1 text-xs text-neutral-400", children: cap }, cap))) })] }))] }));
}
