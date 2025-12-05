import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * OmniAgent Input - Tier 2
 * "Ask OmniAgent" input in Research Mode
 */
import { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { runAgent } from '../agent/runAgent';
import { executeAgentGoal } from '../core/agent/integration';
import { toast } from '../utils/toast';
import { validateUrlForAgent } from '../core/security/urlSafety';
export function OmniAgentInput({ currentUrl, onResult }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim() || loading)
            return;
        setLoading(true);
        try {
            // Tier 3: Use new agent planner for complex goals
            let result;
            // Check if it's a complex multi-step goal
            const isComplexGoal = query.toLowerCase().includes('research') &&
                (query.toLowerCase().includes('compare') ||
                    query.toLowerCase().includes('save') ||
                    query.toLowerCase().includes('workspace'));
            if (isComplexGoal) {
                // Use new agent graph system
                result = await executeAgentGoal(query);
                onResult?.({
                    type: 'complex_plan',
                    content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                    sources: [],
                });
            }
            else {
                // Use simple agent for quick tasks
                let task;
                if (currentUrl &&
                    (query.toLowerCase().includes('explain') || query.toLowerCase().includes('this page'))) {
                    const validation = validateUrlForAgent(currentUrl);
                    if (!validation.safe) {
                        toast.error(validation.reason || 'Unsafe URL');
                        setLoading(false);
                        return;
                    }
                    task = { type: 'explain_page', url: currentUrl };
                }
                else if (query.toLowerCase().includes('compare') && query.includes('http')) {
                    const urlMatches = query.match(/https?:\/\/[^\s]+/g) || [];
                    if (urlMatches.length >= 2) {
                        const validation = urlMatches.every(url => validateUrlForAgent(url).safe);
                        if (!validation) {
                            toast.error('One or more URLs are unsafe');
                            setLoading(false);
                            return;
                        }
                        task = { type: 'compare_urls', urls: urlMatches };
                    }
                    else {
                        task = { type: 'deep_research', topic: query };
                    }
                }
                else if (query.toLowerCase().includes('research') || query.length > 50) {
                    task = { type: 'deep_research', topic: query };
                }
                else if (currentUrl) {
                    const validation = validateUrlForAgent(currentUrl);
                    if (!validation.safe) {
                        toast.error(validation.reason || 'Unsafe URL');
                        setLoading(false);
                        return;
                    }
                    task = { type: 'quick_summary', url: currentUrl };
                }
                else {
                    task = { type: 'deep_research', topic: query };
                }
                result = await runAgent(task);
                onResult?.(result);
            }
            toast.success('OmniAgent completed!');
        }
        catch (error) {
            console.error('OmniAgent error', error);
            toast.error(error instanceof Error ? error.message : 'OmniAgent failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "border-t border-slate-800 bg-slate-900/50 p-4", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm text-gray-400", children: [_jsx(Sparkles, { size: 14 }), _jsx("span", { children: "Ask OmniAgent" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { id: "omni-agent-query", name: "omni-agent-query", type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: currentUrl
                                ? 'Explain this page, research a topic, or compare URLs...'
                                : 'Research a topic, compare URLs, or ask a question...', disabled: loading, className: "flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" }), _jsx("button", { type: "submit", disabled: !query.trim() || loading, className: "flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 14, className: "animate-spin" }), _jsx("span", { className: "text-xs", children: "Processing..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { size: 14 }), _jsx("span", { className: "text-xs", children: "Ask" })] })) })] }), _jsx("div", { className: "text-xs text-gray-500", children: "Examples: \"Explain this page\", \"Research benefits of intermittent fasting\", \"Compare https://example.com and https://example.org\"" })] }) }));
}
