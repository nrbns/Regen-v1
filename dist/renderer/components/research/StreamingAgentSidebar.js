import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Streaming Agent Sidebar - Real-time Agent Research
 * Listens to Tauri agent-event stream and displays incremental updates
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, CheckCircle2, AlertCircle, Loader2, Sparkles, Play, Square, AlertTriangle, } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTabsStore } from '../../state/tabsStore';
import { toast } from '../../utils/toast';
// WebSocket client for real-time streaming
const WS_URL = 'ws://127.0.0.1:18080/agent_ws';
export function StreamingAgentSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [query, setQuery] = useState('');
    const [currentUrl, setCurrentUrl] = useState(null);
    const [summaryText, setSummaryText] = useState('');
    const [finalSummary, setFinalSummary] = useState(null);
    const [suggestedActions, setSuggestedActions] = useState([]);
    const [error, setError] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const { tabs, activeId } = useTabsStore();
    const activeTab = tabs.find(t => t.id === activeId);
    const unlistenRef = useRef(null);
    const wsRef = useRef(null);
    const wsReconnectTimeoutRef = useRef(null);
    // Update current URL when active tab changes
    useEffect(() => {
        if (activeTab) {
            setCurrentUrl(activeTab.url || null);
        }
    }, [activeTab]);
    // Connect to WebSocket for real-time streaming
    useEffect(() => {
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const connectWebSocket = () => {
            try {
                ws = new WebSocket(WS_URL);
                wsRef.current = ws;
                ws.onopen = () => {
                    console.log('[WebSocket] Connected to agent server');
                    reconnectAttempts = 0;
                    // Send ping to verify connection
                    ws?.send(JSON.stringify({ type: 'ping' }));
                };
                ws.onmessage = event => {
                    // PR: Fix tab switch - filter events by tabId
                    const currentActiveId = useTabsStore.getState().activeId;
                    try {
                        const data = JSON.parse(event.data);
                        // Handle pong
                        if (data.type === 'pong') {
                            return;
                        }
                        // Handle connection confirmation
                        if (data.type === 'connected') {
                            console.log('[WebSocket] Connection confirmed:', data.connection_id);
                            return;
                        }
                        // PR: Fix tab switch - filter events by tabId
                        const eventTabId = data.tabId || data.tab_id;
                        if (eventTabId && eventTabId !== currentActiveId) {
                            console.log('[StreamingAgentSidebar] Ignoring event for inactive tab', {
                                eventTabId,
                                currentActiveId,
                                type: data.type,
                            });
                            return;
                        }
                        // Handle agent events
                        const agentEvent = data;
                        switch (agentEvent.type) {
                            case 'agent_start':
                                setIsStreaming(true);
                                setSummaryText('');
                                setFinalSummary(null);
                                setSuggestedActions([]);
                                setError(null);
                                setIsCached(false);
                                setQuery(agentEvent.payload.query);
                                break;
                            case 'partial_summary':
                                if (agentEvent.payload.cached) {
                                    setIsCached(true);
                                }
                                setSummaryText(prev => prev + agentEvent.payload.text);
                                break;
                            case 'action_suggestion':
                                setSuggestedActions(prev => [...prev, agentEvent.payload]);
                                break;
                            case 'final_summary':
                                setFinalSummary(agentEvent.payload);
                                setIsStreaming(false);
                                break;
                            case 'agent_end':
                                setIsStreaming(false);
                                if (agentEvent.payload.success) {
                                    if (agentEvent.payload.cached) {
                                        toast.success('Loaded from cache');
                                    }
                                    else {
                                        toast.success('Research complete');
                                    }
                                }
                                break;
                            case 'error':
                                setError(agentEvent.payload.message);
                                setIsStreaming(false);
                                toast.error(agentEvent.payload.message);
                                break;
                            case 'agent_busy':
                                setError(agentEvent.payload.message);
                                setIsStreaming(false);
                                toast.warning(agentEvent.payload.message);
                                break;
                        }
                    }
                    catch (err) {
                        console.error('[WebSocket] Failed to parse message:', err);
                    }
                };
                ws.onerror = error => {
                    console.error('[WebSocket] Error:', error);
                };
                ws.onclose = event => {
                    console.log('[WebSocket] Connection closed', event.code, event.reason);
                    wsRef.current = null;
                    // Don't reconnect if it was a normal closure (code 1000) or user-initiated
                    if (event.code === 1000 || event.code === 1001) {
                        console.log('[WebSocket] Normal closure, not reconnecting');
                        return;
                    }
                    // Attempt reconnect
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
                        wsReconnectTimeoutRef.current = setTimeout(() => {
                            connectWebSocket();
                        }, delay);
                    }
                    else {
                        console.error('[WebSocket] Max reconnect attempts reached');
                        toast.error('Lost connection to agent server. Please refresh the page.');
                        setError('Connection lost. Please refresh to reconnect.');
                    }
                };
            }
            catch (err) {
                console.error('[WebSocket] Failed to connect:', err);
                // Fallback to Tauri events if WebSocket fails
                setupTauriListener();
            }
        };
        // Fallback: Listen for Tauri events if WebSocket unavailable
        const setupTauriListener = async () => {
            try {
                const unlistenFn = await listen('agent-event', (_event) => {
                    // Same event handling as WebSocket (handled by WebSocket connection)
                    // This is a fallback that's not currently used
                });
                unlistenRef.current = unlistenFn;
            }
            catch (err) {
                console.error('[StreamingAgentSidebar] Failed to setup Tauri listener:', err);
            }
        };
        connectWebSocket();
        // MEMORY LEAK FIX: Listen for tab close to cleanup WebSocket
        const handleTabClose = (() => {
            if (ws) {
                ws.close();
            }
            if (wsReconnectTimeoutRef.current) {
                clearTimeout(wsReconnectTimeoutRef.current);
            }
        });
        window.addEventListener('tab-closed', handleTabClose);
        return () => {
            window.removeEventListener('tab-closed', handleTabClose);
            if (ws) {
                ws.close();
            }
            if (wsReconnectTimeoutRef.current) {
                clearTimeout(wsReconnectTimeoutRef.current);
            }
            if (unlistenRef.current) {
                unlistenRef.current();
            }
        };
    }, []);
    const startAgent = useCallback(async () => {
        if (!query.trim()) {
            toast.error('Please enter a query');
            return;
        }
        try {
            // Extract page text first if URL is available
            let pageText;
            if (currentUrl) {
                try {
                    const extracted = await invoke('extract_page_text', { url: currentUrl });
                    pageText = extracted.text;
                }
                catch (err) {
                    console.warn('[StreamingAgentSidebar] Failed to extract page text:', err);
                }
            }
            // PR: Fix tab switch - include tabId in start_agent message
            const activeTabId = useTabsStore.getState().activeId;
            const activeTab = useTabsStore.getState().tabs.find(t => t.id === activeTabId);
            // Try WebSocket first, fallback to Tauri invoke
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                // Send start_agent message via WebSocket with tabId
                wsRef.current.send(JSON.stringify({
                    type: 'start_agent',
                    tabId: activeTabId,
                    tab_id: activeTabId, // Support both camelCase and snake_case
                    query: query.trim(),
                    url: currentUrl || undefined,
                    context: pageText ? pageText.substring(0, 2000) : undefined,
                    mode: 'local',
                    session_id: activeTab?.sessionId || undefined,
                    sessionId: activeTab?.sessionId || undefined,
                }));
                console.log('[StreamingAgentSidebar] Sent start_agent', {
                    tabId: activeTabId,
                    url: currentUrl,
                });
            }
            else {
                // Fallback to Tauri invoke
                await invoke('research_agent_stream', {
                    request: {
                        query: query.trim(),
                        url: currentUrl || undefined,
                        context: pageText ? pageText.substring(0, 2000) : undefined,
                        mode: 'local',
                    },
                });
            }
        }
        catch (err) {
            setError(err.message || 'Failed to start agent');
            setIsStreaming(false);
            toast.error('Failed to start agent research');
        }
    }, [query, currentUrl]);
    const stopAgent = useCallback(() => {
        // Note: Tauri doesn't have built-in cancellation, but we can reset state
        setIsStreaming(false);
        setError('Cancelled by user');
        toast.info('Agent stopped');
    }, []);
    const confirmAndExecuteAction = useCallback((action) => {
        setPendingAction(action);
    }, []);
    const executeAction = useCallback(async (action) => {
        setPendingAction(null); // Close modal
        try {
            await invoke('execute_agent', {
                request: {
                    actions: [action],
                    session_id: undefined,
                },
            });
            toast.success(`Action "${action.label}" executed`);
            // Remove executed action from suggestions
            setSuggestedActions(prev => prev.filter(a => a.id !== action.id));
        }
        catch (err) {
            toast.error(`Failed to execute action: ${err.message}`);
        }
    }, []);
    const cancelAction = useCallback(() => {
        setPendingAction(null);
    }, []);
    const clearResults = useCallback(() => {
        setSummaryText('');
        setFinalSummary(null);
        setSuggestedActions([]);
        setError(null);
        setIsCached(false);
    }, []);
    if (!isOpen) {
        return (_jsxs("button", { onClick: () => setIsOpen(true), className: "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 p-4 font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:from-purple-700 hover:to-pink-700", children: [_jsx(Bot, { className: "h-5 w-5" }), _jsx("span", { children: "AI Agent" })] }));
    }
    return (_jsxs(motion.div, { initial: { x: 400 }, animate: { x: 0 }, exit: { x: 400 }, className: "fixed bottom-0 right-0 top-0 z-50 flex w-96 flex-col border-l border-slate-700 bg-slate-900 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-700 bg-slate-800 p-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-5 w-5 text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold text-white", children: "AI Research Agent" })] }), _jsx("button", { onClick: () => setIsOpen(false), className: "text-gray-400 transition-colors hover:text-white", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "border-b border-slate-700 p-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), onKeyDown: e => {
                                    if (e.key === 'Enter' && !isStreaming) {
                                        startAgent();
                                    }
                                }, placeholder: "Research query...", disabled: isStreaming, className: "flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50" }), isStreaming ? (_jsx("button", { onClick: stopAgent, className: "rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700", children: _jsx(Square, { className: "h-4 w-4" }) })) : (_jsx("button", { onClick: startAgent, disabled: !query.trim(), className: "rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50", children: _jsx(Play, { className: "h-4 w-4" }) }))] }), currentUrl && (_jsxs("p", { className: "mt-2 truncate text-xs text-gray-400", title: currentUrl, children: ["Analyzing: ", new URL(currentUrl).hostname] }))] }), _jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto p-4", children: [error && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-red-700 bg-red-900/20 p-3", children: [_jsx(AlertCircle, { className: "mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-red-400", children: "Error" }), _jsx("p", { className: "mt-1 text-xs text-red-300", children: error })] })] })), isStreaming && !summaryText && (_jsxs("div", { className: "flex items-center gap-3 text-gray-400", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), _jsx("span", { className: "text-sm", children: "Starting research..." })] })), summaryText && (_jsxs("div", { className: "rounded-lg bg-slate-800 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx(Bot, { className: "h-4 w-4 text-purple-400" }), _jsxs("h3", { className: "text-sm font-semibold text-white", children: [isStreaming ? 'Streaming...' : 'Summary', isCached && _jsx("span", { className: "ml-2 text-xs text-green-400", children: "(Cached)" })] })] }), _jsxs("div", { className: "whitespace-pre-wrap text-sm text-gray-300", children: [summaryText, isStreaming && (_jsx("span", { className: "ml-1 inline-block h-4 w-2 animate-pulse bg-purple-400" }))] })] })), finalSummary && (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "rounded-lg bg-slate-800 p-4", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx(CheckCircle2, { className: "h-4 w-4 text-green-400" }), _jsx("h3", { className: "text-sm font-semibold text-white", children: "Final Summary" }), finalSummary.confidence && (_jsxs("span", { className: "ml-auto text-xs text-gray-400", children: [Math.round(finalSummary.confidence * 100), "% confidence"] }))] }), _jsx("p", { className: "mb-3 text-sm text-gray-300", children: finalSummary.summary.short }), finalSummary.summary.bullets.length > 0 && (_jsx("ul", { className: "mb-3 list-inside list-disc space-y-1 text-sm text-gray-300", children: finalSummary.summary.bullets.map((bullet, i) => (_jsx("li", { children: bullet }, i))) })), finalSummary.summary.keywords.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: finalSummary.summary.keywords.map((keyword, i) => (_jsx("span", { className: "rounded bg-purple-900/30 px-2 py-1 text-xs text-purple-300", children: keyword }, i))) }))] })), suggestedActions.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-white", children: [_jsx(Sparkles, { className: "h-4 w-4 text-purple-400" }), "Suggested Actions"] }), suggestedActions.map(action => (_jsxs(motion.div, { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, className: "rounded-lg border border-slate-700 bg-slate-800 p-3", children: [_jsxs("div", { className: "mb-2 flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-white", children: action.label }), _jsx("p", { className: "mt-1 text-xs text-gray-400", children: action.action_type })] }), action.confidence && (_jsxs("span", { className: "text-xs text-gray-400", children: [Math.round(action.confidence * 100), "%"] }))] }), _jsx("button", { onClick: () => confirmAndExecuteAction(action), className: "mt-2 w-full rounded bg-purple-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-purple-700", children: "Execute" })] }, action.id)))] })), !isStreaming && !summaryText && !finalSummary && !error && (_jsxs("div", { className: "py-8 text-center text-gray-400", children: [_jsx(Bot, { className: "mx-auto mb-3 h-12 w-12 opacity-50" }), _jsx("p", { className: "text-sm", children: "Enter a query to start research" }), _jsx("p", { className: "mt-2 text-xs text-gray-500", children: "The agent will analyze the current page and provide insights" })] }))] }), (summaryText || finalSummary) && (_jsx("div", { className: "border-t border-slate-700 bg-slate-800 p-4", children: _jsx("button", { onClick: clearResults, className: "w-full rounded bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600", children: "Clear Results" }) })), _jsx(AnimatePresence, { children: pendingAction && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: cancelAction, className: "fixed inset-0 z-[60] bg-black/50" }), _jsx(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, className: "fixed inset-0 z-[70] flex items-center justify-center p-4", onClick: e => e.stopPropagation(), children: _jsxs("div", { className: "w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx(AlertTriangle, { className: "h-6 w-6 text-yellow-400" }), _jsx("h3", { className: "text-lg font-semibold text-white", children: "Confirm Action" })] }), _jsxs("div", { className: "mb-4", children: [_jsx("p", { className: "mb-2 text-sm text-gray-300", children: "The agent wants to execute:" }), _jsxs("div", { className: "mb-2 rounded bg-slate-900 p-3", children: [_jsx("p", { className: "text-sm font-medium text-white", children: pendingAction.label }), _jsxs("p", { className: "mt-1 text-xs text-gray-400", children: ["Type: ", pendingAction.action_type] }), pendingAction.confidence && (_jsxs("p", { className: "mt-1 text-xs text-gray-400", children: ["Confidence: ", Math.round(pendingAction.confidence * 100), "%"] }))] }), _jsx("p", { className: "text-xs text-yellow-400", children: "\u26A0\uFE0F This action will be executed immediately. Please review before confirming." })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: cancelAction, className: "flex-1 rounded bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600", children: "Cancel" }), _jsx("button", { onClick: () => executeAction(pendingAction), className: "flex-1 rounded bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700", children: "Confirm & Execute" })] })] }) })] })) })] }));
}
