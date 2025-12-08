import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Research Pane - Right-side panel for Research Mode
 * Provides query interface, streaming answers, and source cards
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles, BookOpen, FileText, Upload, Camera, Loader2, ExternalLink, ClipboardList, CheckCircle2,
// ChevronRight,
 } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { searchChunks, syncDocumentsFromBackend } from '../../lib/research/cache';
import { DocumentViewer } from './DocumentViewer';
import { ipcEvents } from '../../lib/ipc-events';
import { runResearchAgent } from '../../services/researchAgent';
import { showToast } from '../../state/toastStore';
const AGENT_DEFAULT_PROMPT = 'Summarize this page and list 3 concrete follow-up actions for my research.';
export function ResearchPane() {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [answerChunks, setAnswerChunks] = useState([]);
    const [sources, setSources] = useState([]);
    const [activeSourceId, setActiveSourceId] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [viewerDocument, setViewerDocument] = useState(null);
    const [viewerHighlight, setViewerHighlight] = useState();
    const { activeId, tabs } = useTabsStore();
    const activeTab = tabs.find(tab => tab.id === activeId);
    const streamChannelRef = useRef(null);
    const listenerRef = useRef(null);
    const agentPromptRef = useRef(null);
    const [agentPrompt, setAgentPrompt] = useState(AGENT_DEFAULT_PROMPT);
    const [agentResponse, setAgentResponse] = useState(null);
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentError, setAgentError] = useState(null);
    const [pendingActionId, setPendingActionId] = useState(null);
    // Check if Research Mode is active
    const mode = useAppStore(s => s.mode);
    const isResearchMode = mode === 'Research';
    useEffect(() => {
        // Auto-open when Research mode is active
        if (isResearchMode && !isOpen) {
            setIsOpen(true);
        }
    }, [isResearchMode, isOpen]);
    // Sync documents from backend on mount
    useEffect(() => {
        if (isOpen) {
            syncDocumentsFromBackend().catch(error => {
                console.error('Failed to sync documents on mount:', error);
            });
        }
    }, [isOpen]);
    // Listen for keyboard shortcuts to open pane
    useEffect(() => {
        const handleKeyboardOpen = () => {
            setIsOpen(true);
        };
        ipcEvents.on('research:keyboard-open-pane', handleKeyboardOpen);
        return () => {
            ipcEvents.off('research:keyboard-open-pane', handleKeyboardOpen);
        };
    }, []);
    // Cleanup stream listener
    useEffect(() => {
        return () => {
            if (streamChannelRef.current && listenerRef.current && window.ipc?.removeListener) {
                window.ipc.removeListener(streamChannelRef.current, listenerRef.current);
            }
        };
    }, []);
    const handleQuery = useCallback(async () => {
        if (!query.trim() || isLoading)
            return;
        setIsLoading(true);
        setAnswerChunks([]);
        setSources([]);
        setActiveSourceId(null);
        try {
            // First, try local cache search for instant results
            const localResults = await searchChunks(query.trim(), 5);
            if (localResults.length > 0) {
                // Show local results immediately
                const localSources = localResults.map(chunk => ({
                    id: chunk.id,
                    title: chunk.metadata.title || 'Cached Document',
                    url: chunk.metadata.url || '',
                    snippet: chunk.content.slice(0, 200) + '...',
                    type: (chunk.metadata.sourceType || 'web'),
                    confidence: 0.8, // High confidence for local matches
                }));
                setSources(localSources);
            }
            // Start research stream (server-side)
            const { channel } = await ipc.researchStream.start(query.trim(), 'default');
            streamChannelRef.current = channel;
            if (window.ipc?.on) {
                const listener = (_event, payload) => {
                    switch (payload?.type) {
                        case 'chunk':
                            setAnswerChunks(prev => [
                                ...prev,
                                { content: payload.content, citations: payload.citations || [] },
                            ]);
                            break;
                        case 'sources':
                            if (payload.entries) {
                                const sourceList = Object.entries(payload.entries).flatMap(([citeId, cites]) => (Array.isArray(cites) ? cites : []).map((cite) => ({
                                    id: cite.id || citeId,
                                    title: cite.title || 'Untitled',
                                    url: cite.url || cite.fragmentUrl || '',
                                    snippet: cite.snippet,
                                    type: 'web',
                                    confidence: cite.relevanceScore,
                                    publishedAt: cite.publishedAt,
                                })));
                                setSources(prev => {
                                    const existingIds = new Set(prev.map(s => s.id));
                                    const newSources = sourceList.filter(s => !existingIds.has(s.id));
                                    return [...prev, ...newSources];
                                });
                            }
                            break;
                        case 'complete':
                            setIsLoading(false);
                            break;
                        case 'error':
                            setIsLoading(false);
                            console.error('Research error:', payload.message);
                            break;
                    }
                };
                listenerRef.current = listener;
                window.ipc.on(channel, listener);
            }
        }
        catch (error) {
            setIsLoading(false);
            console.error('Failed to start research:', error);
        }
    }, [query, isLoading]);
    const handleSaveTabSnapshot = useCallback(async () => {
        if (!activeTab?.id)
            return;
        try {
            const { snapshotId } = await ipc.research.saveSnapshot(activeTab.id);
            console.log('Tab snapshot saved:', snapshotId);
            // Sync to cache after a short delay (allowing backend processing)
            setTimeout(async () => {
                try {
                    await syncDocumentsFromBackend();
                }
                catch (error) {
                    console.error('Failed to sync to cache:', error);
                }
            }, 2000);
        }
        catch (error) {
            console.error('Failed to save snapshot:', error);
        }
    }, [activeTab]);
    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            const fileId = await ipc.research.uploadFile(file);
            console.log('File uploaded:', fileId);
            // Sync to cache after a short delay (allowing backend processing)
            setTimeout(async () => {
                try {
                    await syncDocumentsFromBackend();
                }
                catch (error) {
                    console.error('Failed to sync to cache:', error);
                }
            }, 2000);
            // Reset input
            event.target.value = '';
        }
        catch (error) {
            console.error('Failed to upload file:', error);
            event.target.value = '';
        }
    }, []);
    const buildAgentContext = useCallback(() => {
        let selection;
        if (typeof window !== 'undefined' && window.getSelection) {
            const rawSelection = window.getSelection()?.toString();
            if (rawSelection) {
                selection = rawSelection.slice(0, 2000);
            }
        }
        return {
            url: activeTab?.url || undefined,
            title: activeTab?.title || undefined,
            selection,
            mode: 'research',
        };
    }, [activeTab]);
    const handleRunAgent = useCallback(async () => {
        if (!agentPrompt.trim() || agentLoading)
            return;
        setAgentLoading(true);
        setAgentError(null);
        try {
            const response = await runResearchAgent(agentPrompt.trim(), {
                maxResults: 10,
                includeCitations: true,
            });
            // Convert ResearchAgentResult to ResearchAgentResponse
            const agentResponse = {
                summary: response.summary,
                confidence: response.confidence,
                actions: [], // ResearchAgentResult doesn't have actions
                citations: (response.citations || []).map((c) => ({
                    label: c.label || c.text || '',
                    url: c.url || '',
                })),
                model: response.method,
            };
            setAgentResponse(agentResponse);
            showToast('success', 'Research Agent ready');
            if (ipc.telemetry?.trackFeature) {
                ipc.telemetry.trackFeature('research_agent', 'run').catch(() => { });
            }
        }
        catch (error) {
            console.error('[ResearchPane] Research Agent failed:', error);
            setAgentError(error instanceof Error ? error.message : 'Unable to run Research Agent.');
            showToast('error', 'Research Agent failed');
        }
        finally {
            setAgentLoading(false);
        }
    }, [agentPrompt, agentLoading]);
    const handleAgentAction = useCallback(async (action) => {
        setPendingActionId(action.id);
        try {
            // Create a follow-up prompt based on the action
            const followUpPrompt = action.type === 'follow_up' && action.payload?.query
                ? action.payload.query
                : action.description || action.label;
            if (followUpPrompt) {
                setAgentPrompt(followUpPrompt);
                requestAnimationFrame(() => agentPromptRef.current?.focus());
            }
            showToast('success', action.type === 'follow_up' ? 'Drafted follow-up question' : 'Action executed');
        }
        catch (error) {
            console.error('[ResearchPane] Agent action failed:', error);
            showToast('error', 'Failed to run action');
        }
        finally {
            setPendingActionId(null);
        }
    }, [buildAgentContext]);
    const handleOpenSource = useCallback(async (url) => {
        try {
            if (activeId) {
                await ipc.tabs.navigate(activeId, url);
            }
            else {
                await ipc.tabs.create(url);
            }
        }
        catch (error) {
            console.error('Failed to open source:', error);
        }
    }, [activeId]);
    const handleViewDocument = useCallback(async (source, highlight) => {
        // Try to get full content from cache or backend
        try {
            // For now, use the snippet as content
            // In a full implementation, we'd fetch the full document
            setViewerDocument({
                id: source.id,
                title: source.title,
                url: source.url,
                type: source.type === 'repo' ? 'web' : source.type,
                snippet: source.snippet,
            });
            setViewerHighlight(highlight);
        }
        catch (error) {
            console.error('Failed to load document:', error);
        }
    }, []);
    if (!isOpen) {
        return (_jsx("button", { onClick: () => setIsOpen(true), className: "fixed right-4 top-20 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg transition-colors hover:bg-blue-700", title: "Open Research Pane", "aria-label": "Open Research Pane", children: _jsx(BookOpen, { size: 20 }) }));
    }
    return (_jsxs(motion.div, { initial: { x: 400 }, animate: { x: 0 }, exit: { x: 400 }, className: "fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-slate-800 bg-slate-950 shadow-2xl", role: "complementary", "aria-label": "Research Mode panel", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { size: 18, className: "text-blue-400" }), _jsx("h2", { className: "text-sm font-semibold text-gray-100", children: "Research Mode" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: handleSaveTabSnapshot, disabled: !activeTab, className: "rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40", title: "Save current tab snapshot", children: _jsx(Camera, { size: 16 }) }), _jsxs("label", { className: "cursor-pointer rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-gray-200", children: [_jsx(Upload, { size: 16 }), _jsx("input", { type: "file", accept: ".pdf,.docx,.txt,.md", onChange: handleFileUpload, className: "hidden" })] }), _jsx("button", { onClick: () => setIsOpen(false), className: "rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-gray-200", children: _jsx(X, { size: 16 }) })] })] }), _jsx("div", { className: "border-b border-slate-800 bg-slate-900/50 p-4", children: _jsxs("form", { "aria-label": "Research query form", onSubmit: e => {
                        e.preventDefault();
                        handleQuery();
                    }, className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" }), _jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Ask a research question...", className: "w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50", disabled: isLoading, "aria-label": "Research question" })] }), _jsx("button", { type: "submit", disabled: isLoading || !query.trim(), className: "flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 14, className: "animate-spin" }), "Searching..."] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { size: 14 }), "Search"] })) })] }) }), _jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-4", children: [_jsxs("div", { className: "space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4", role: "region", "aria-label": "Research Agent", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-slate-200", children: [_jsx(ClipboardList, { size: 16, className: "text-blue-400" }), "Research Agent"] }), agentResponse && (_jsxs("span", { className: "text-xs text-slate-400", children: ["Confidence ", (agentResponse.confidence * 100).toFixed(0), "%"] }))] }), _jsx("textarea", { id: "research-pane-agent-prompt", name: "research-agent-prompt", ref: agentPromptRef, value: agentPrompt, onChange: e => setAgentPrompt(e.target.value), rows: 3, className: "w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60", placeholder: "Ask the Research Agent to summarize, compare, or plan next steps...", "aria-label": "Research agent prompt", disabled: agentLoading }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: handleRunAgent, disabled: agentLoading || !agentPrompt.trim(), className: "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60", children: [agentLoading ? (_jsx(Loader2, { size: 16, className: "animate-spin" })) : (_jsx(Sparkles, { size: 16 })), agentLoading ? 'Running agent…' : 'Run Research Agent'] }), agentResponse && (_jsx("button", { type: "button", onClick: () => {
                                            setAgentResponse(null);
                                            setAgentError(null);
                                        }, className: "rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100", children: "Clear" }))] }), agentError && (_jsx("div", { className: "rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200", children: agentError })), agentResponse && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-100", children: [_jsx("p", { className: "whitespace-pre-line leading-relaxed", children: agentResponse.summary }), agentResponse.citations.length > 0 && (_jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: agentResponse.citations.map(citation => (_jsxs("a", { href: citation.url, target: "_blank", rel: "noreferrer", className: "inline-flex items-center gap-1 rounded-full border border-blue-500/40 px-2 py-0.5 text-[11px] text-blue-200 transition hover:border-blue-400 hover:text-white", children: [_jsx(ExternalLink, { size: 12 }), citation.label] }, citation.url))) }))] }), _jsxs("div", { className: "space-y-2", children: [agentResponse.actions.length === 0 && (_jsx("div", { className: "rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400", role: "status", "aria-live": "polite", children: "The agent did not recommend any actions for this query." })), agentResponse.actions.map(action => (_jsxs("button", { type: "button", onClick: () => handleAgentAction(action), disabled: pendingActionId === action.id, className: "flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-blue-500/40 hover:bg-slate-900/70 disabled:cursor-wait disabled:opacity-60", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: action.label }), action.description && (_jsx("div", { className: "text-xs text-slate-400", children: action.description })), action.badge && (_jsx("div", { className: "mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200", children: action.badge }))] }), pendingActionId === action.id ? (_jsx(Loader2, { size: 16, className: "animate-spin text-blue-400" })) : (_jsx(CheckCircle2, { size: 16, className: "text-emerald-400" }))] }, action.id)))] })] }))] }), answerChunks.length > 0 && (_jsxs("div", { className: "space-y-3", "aria-live": "polite", children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-gray-400", children: "Answer" }), _jsxs("div", { className: "space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4", children: [answerChunks.map((chunk, idx) => (_jsx("div", { className: "text-sm leading-relaxed text-gray-200", children: chunk.content.split(/(\[(\d+)\])/g).map((part, i) => {
                                            const citationMatch = part.match(/^\[(\d+)\]$/);
                                            if (citationMatch) {
                                                const citeNum = citationMatch[1];
                                                const citedSource = sources.find((s, idx) => idx + 1 === parseInt(citeNum));
                                                return (_jsxs("button", { onClick: () => {
                                                        if (citedSource) {
                                                            handleViewDocument(citedSource);
                                                        }
                                                    }, className: "ml-1 inline-flex cursor-pointer items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-200 transition-colors hover:border-blue-400/60 hover:bg-blue-500/25", title: citedSource
                                                        ? `View source: ${citedSource.title}`
                                                        : `Citation ${citeNum}`, children: ["[", citeNum, "]"] }, i));
                                            }
                                            return _jsx("span", { children: part }, i);
                                        }) }, idx))), isLoading && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-400", children: [_jsx(Loader2, { size: 12, className: "animate-spin" }), "Streaming answer..."] }))] })] })), sources.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("h3", { className: "text-xs font-semibold uppercase tracking-wide text-gray-400", children: ["Sources (", sources.length, ")"] }), _jsx("div", { className: "space-y-2", children: _jsx(AnimatePresence, { children: sources.map(source => (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, className: `cursor-pointer space-y-2 rounded-lg border p-3 transition-colors ${activeSourceId === source.id
                                            ? 'border-blue-500/60 bg-blue-500/10'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`, role: "button", tabIndex: 0, "aria-pressed": activeSourceId === source.id, onClick: () => setActiveSourceId(activeSourceId === source.id ? null : source.id), onKeyDown: e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setActiveSourceId(activeSourceId === source.id ? null : source.id);
                                            }
                                        }, children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: "rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-gray-400", children: source.type }), source.confidence && (_jsxs("span", { className: "text-[10px] text-gray-500", children: [Math.round(source.confidence * 100), "% match"] }))] }), _jsx("h4", { className: "truncate text-sm font-medium text-gray-200", children: source.title }), source.snippet && (_jsx("p", { className: "mt-1 line-clamp-2 text-xs text-gray-400", children: source.snippet })), _jsx("p", { className: "mt-1 truncate text-[10px] text-gray-500", children: source.url })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: e => {
                                                                e.stopPropagation();
                                                                handleViewDocument(source, source.snippet);
                                                            }, className: "rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-gray-200", title: "View document", children: _jsx(FileText, { size: 14 }) }), source.url && (_jsx("button", { onClick: e => {
                                                                e.stopPropagation();
                                                                handleOpenSource(source.url);
                                                            }, className: "rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-gray-200", title: "Open in tab", children: _jsx(ExternalLink, { size: 14 }) }))] })] }) }, source.id))) }) })] })), !isLoading && answerChunks.length === 0 && sources.length === 0 && (_jsxs("div", { className: "flex h-full flex-col items-center justify-center space-y-3 text-center text-gray-500", children: [_jsx(BookOpen, { size: 48, className: "opacity-50" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-400", children: "Start researching" }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Ask a question or save a tab snapshot to begin" })] })] }))] }), viewerDocument && (_jsx(DocumentViewer, { isOpen: !!viewerDocument, onClose: () => {
                    setViewerDocument(null);
                    setViewerHighlight(undefined);
                }, document: viewerDocument, highlightText: viewerHighlight }))] }));
}
