import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, ExternalLink, Loader2, Pin, PinOff, Send, Sparkles, Timer } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { showToast } from '../../state/toastStore';
const createId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `dock-${Math.random().toString(36).slice(2, 10)}`;
};
const estimateTokens = (prompt, answer) => {
    const combined = prompt.length + answer.length;
    return Math.max(32, Math.round(combined / 4));
};
export function AIDockPanel() {
    const [prompt, setPrompt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pinned, setPinned] = useState(true);
    const [history, setHistory] = useState([]);
    const activeTab = useTabsStore(state => {
        const tab = state.tabs.find(t => t.id === state.activeId);
        return tab ? { url: tab.url, title: tab.title } : null;
    });
    const latest = history[0];
    const contextLabel = useMemo(() => {
        if (!activeTab?.url) {
            return 'general';
        }
        try {
            const parsed = new URL(activeTab.url);
            return parsed.hostname;
        }
        catch {
            return 'current page';
        }
    }, [activeTab?.url]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        const question = prompt.trim();
        if (!question || isSubmitting) {
            return;
        }
        if (!activeTab?.url) {
            showToast('error', 'Open a tab to provide page context.');
            return;
        }
        setIsSubmitting(true);
        const started = performance.now();
        let jobId = null;
        try {
            const response = await ipc.agent.askWithScrape({
                url: activeTab.url,
                question,
                task: 'qa',
                waitFor: 8,
            });
            // Handle 202 enqueued response - poll for result
            if (response.status === 'enqueued' && response.jobId) {
                jobId = response.jobId;
                showToast('info', 'Fetching page safely... This may take a few seconds.');
                // Poll for result
                const pollInterval = setInterval(async () => {
                    try {
                        const resultEndpoint = process.env.AGENT_QUERY_ENDPOINT?.replace('/api/agent/query', '') ||
                            'http://127.0.0.1:4000';
                        const resultResponse = await fetch(`${resultEndpoint}/api/agent/result/${jobId}/qa`, {
                            method: 'GET',
                            headers: { 'content-type': 'application/json' },
                        });
                        if (resultResponse.ok) {
                            clearInterval(pollInterval);
                            const result = await resultResponse.json();
                            if (result.status === 'complete' && result.agentResult) {
                                const agentResult = result.agentResult;
                                const answer = agentResult.answer?.trim() || 'No answer returned yet.';
                                const sources = Array.isArray(agentResult.sources) && agentResult.sources.length > 0
                                    ? agentResult.sources.map((s) => s.url)
                                    : [activeTab.url];
                                const modelName = typeof agentResult.model === 'string'
                                    ? agentResult.model
                                    : agentResult.model?.name || 'agent:auto';
                                const tokens = typeof agentResult.model === 'object' && agentResult.model.tokensUsed
                                    ? agentResult.model.tokensUsed
                                    : estimateTokens(question, answer);
                                const latencyMs = Math.round(performance.now() - started);
                                const entry = {
                                    id: jobId || createId(),
                                    prompt: question,
                                    answer,
                                    timestamp: Date.now(),
                                    latencyMs,
                                    tokens,
                                    model: modelName,
                                    sources,
                                    scrape: {
                                        status: agentResult.provenance?.status || 200,
                                        cached: agentResult.provenance?.cached || false,
                                        fetchedAt: agentResult.provenance?.fetchedAt,
                                    },
                                };
                                setHistory(prev => [entry, ...prev].slice(0, 5));
                                setPrompt('');
                                setIsSubmitting(false);
                            }
                        }
                        else if (resultResponse.status === 404) {
                            // Still pending, continue polling
                        }
                        else {
                            clearInterval(pollInterval);
                            throw new Error(`Polling failed: ${resultResponse.status}`);
                        }
                    }
                    catch (error) {
                        clearInterval(pollInterval);
                        console.error('[AIDockPanel] polling failed', error);
                        showToast('error', 'Failed to get result');
                        setIsSubmitting(false);
                    }
                }, 1000); // Poll every 1 second
                // Timeout after 30 seconds
                setTimeout(() => {
                    clearInterval(pollInterval);
                    if (isSubmitting) {
                        setIsSubmitting(false);
                        showToast('error', 'Request timed out. Please try again.');
                    }
                }, 30000);
                return;
            }
            // Handle immediate response (200)
            const answer = response?.answer?.trim() || 'No answer returned yet.';
            const sources = Array.isArray(response?.sources) && response.sources.length > 0
                ? response.sources
                : [activeTab.url];
            const modelName = typeof response?.model === 'string'
                ? response.model
                : (typeof response?.model === 'object' &&
                    response.model !== null &&
                    'name' in response.model
                    ? response.model.name
                    : typeof response?.model === 'string'
                        ? response.model
                        : undefined) || 'agent:auto';
            const tokens = typeof response?.model === 'object' &&
                response.model?.tokensUsed
                ? response.model.tokensUsed
                : estimateTokens(question, answer);
            const latencyMs = Math.round(performance.now() - started);
            const entry = {
                id: response?.jobId ?? createId(),
                prompt: question,
                answer,
                timestamp: Date.now(),
                latencyMs,
                tokens,
                model: modelName,
                sources,
                scrape: response?.scrape,
            };
            setHistory(prev => [entry, ...prev].slice(0, 5));
            setPrompt('');
        }
        catch (error) {
            console.error('[AIDockPanel] ask failed', error);
            showToast('error', error instanceof Error ? error.message : 'AI Dock request failed');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const populateFollowUp = () => {
        if (!latest)
            return;
        setPrompt(`Follow up on "${latest.prompt}": `);
    };
    return (_jsxs("section", { "aria-label": "AI Dock", className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-gray-400", children: "AI Dock" }), _jsxs("p", { className: "text-sm text-gray-300", children: ["Ask questions about the ", contextLabel] })] }), _jsxs("button", { type: "button", onClick: () => setPinned(state => !state), className: `inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition ${pinned
                            ? 'border-blue-500/60 bg-blue-500/10 text-blue-200'
                            : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:bg-slate-800'}`, children: [pinned ? _jsx(Pin, { size: 14 }) : _jsx(PinOff, { size: 14 }), pinned ? 'Pinned' : 'Pin'] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-2", children: [_jsx("label", { htmlFor: "ai-dock-question", className: "sr-only", children: "Ask the agent a question" }), _jsx("textarea", { id: "ai-dock-question", value: prompt, onChange: event => setPrompt(event.target.value), disabled: isSubmitting, rows: 3, placeholder: "Ask Omni about this page, summarize findings, or request an action...", className: "w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40" }), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [_jsxs("span", { children: [prompt.length, " chars"] }), _jsxs("button", { type: "submit", disabled: !prompt.trim() || isSubmitting, className: "inline-flex items-center gap-2 rounded-full bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-60", children: [isSubmitting ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Send, { size: 14 }), "Ask"] })] })] }), latest && (_jsxs(motion.div, { layout: true, className: "space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-gray-200", children: [_jsx(Sparkles, { size: 16, className: "text-blue-300" }), "Latest answer"] }), _jsx("button", { type: "button", onClick: populateFollowUp, className: "text-xs font-medium text-blue-300 hover:text-blue-200", children: "Ask follow-up" })] }), _jsx("p", { className: "text-sm text-gray-300 whitespace-pre-wrap", children: latest.answer }), latest.scrape && (_jsxs("div", { className: "text-xs text-gray-500 flex flex-wrap items-center gap-3", children: [_jsx("span", { children: latest.scrape.cached ? 'Cached result' : 'Fresh fetch' }), _jsxs("span", { children: ["HTTP ", latest.scrape.status] }), latest.scrape.fetchedAt && (_jsx("span", { children: new Date(latest.scrape.fetchedAt).toLocaleTimeString() }))] })), _jsxs("div", { className: "rounded-lg border border-slate-800/70 bg-slate-950/60 p-2 text-xs text-gray-400", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Bot, { size: 12 }), " ", latest.model] }), _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Timer, { size: 12 }), " ", latest.latencyMs, " ms"] }), _jsxs("span", { children: [latest.tokens, " tokens (est.)"] }), _jsx("span", { children: new Date(latest.timestamp).toLocaleTimeString() })] }), latest.sources.length > 0 && (_jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-gray-500", children: "Sources:" }), latest.sources.map((source, index) => (_jsxs("button", { type: "button", onClick: () => window.open(source, '_blank'), className: "inline-flex items-center gap-1 rounded-full border border-slate-800/70 px-2 py-0.5 text-[11px] text-blue-200 hover:border-blue-500/60", children: [_jsx(ExternalLink, { size: 12 }), source.replace(/https?:\/\//, '').slice(0, 42)] }, `${latest.id}-source-${index}`)))] }))] })] })), history.length > 1 && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-gray-500", children: "Recent questions" }), _jsx("div", { className: "space-y-2", children: history.slice(1).map(entry => (_jsxs("button", { type: "button", onClick: () => setPrompt(entry.prompt), className: "w-full rounded-xl border border-transparent bg-slate-900/40 p-3 text-left text-sm text-gray-300 transition hover:border-slate-700/70", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [_jsx("span", { children: new Date(entry.timestamp).toLocaleTimeString() }), _jsxs("span", { children: [entry.tokens, " tokens"] })] }), _jsx("p", { className: "mt-1 line-clamp-2 text-sm text-gray-200", children: entry.prompt })] }, entry.id))) })] }))] }));
}
