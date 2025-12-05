import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Research Panel - Streaming research results UI
 * Subscribes to agent.summaries.<id> for real-time updates
 * PR: Realtime streaming UI component
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from '../../utils/toast';
const BUS_URL = import.meta.env.VITE_BUS_URL || 'ws://localhost:4002';
const REQUEST_CHANNEL = 'agent.requests';
const SUMMARY_CHANNEL_PREFIX = 'agent.summaries';
export function ResearchPanel() {
    const [query, setQuery] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [results, setResults] = useState(new Map());
    const [_activeRequestId, setActiveRequestId] = useState(null);
    const wsRef = useRef(null);
    const requestCounterRef = useRef(0);
    /**
     * Connect to bus
     */
    useEffect(() => {
        const ws = new WebSocket(BUS_URL);
        wsRef.current = ws;
        ws.onopen = () => {
            setIsConnected(true);
            console.log('[ResearchPanel] Connected to bus');
            // Subscribe to summary channels (wildcard via pattern matching in bus)
            // For now, we'll subscribe to a pattern channel
            ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'agent.summaries.*', // Pattern subscription
            }));
        };
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            }
            catch (error) {
                console.error('[ResearchPanel] Message parse error:', error);
            }
        };
        ws.onerror = (error) => {
            console.error('[ResearchPanel] WebSocket error:', error);
            setIsConnected(false);
        };
        ws.onclose = () => {
            setIsConnected(false);
            console.log('[ResearchPanel] Disconnected, reconnecting...');
            // Reconnect after delay
            setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.CLOSED) {
                    // Reconnect logic handled by useEffect
                }
            }, 3000);
        };
        return () => {
            ws.close();
        };
    }, []);
    /**
     * Handle bus messages
     */
    const handleMessage = useCallback((message) => {
        if (message.type === 'connected') {
            console.log('[ResearchPanel] Connected as', message.clientId);
            return;
        }
        if (message.type === 'subscribed') {
            console.log('[ResearchPanel] Subscribed to', message.channel);
            return;
        }
        if (message.type === 'message' && message.channel?.startsWith(SUMMARY_CHANNEL_PREFIX)) {
            const chunk = message.data;
            handleSummaryChunk(chunk);
        }
    }, []);
    /**
     * Handle summary chunk
     */
    const handleSummaryChunk = useCallback((chunk) => {
        setResults(prev => {
            const newResults = new Map(prev);
            const requestId = chunk.requestId;
            let result = newResults.get(requestId);
            if (!result) {
                result = {
                    requestId,
                    query: '', // Will be set from start event
                    chunks: [],
                    complete: false,
                    startedAt: chunk.timestamp,
                };
            }
            if (chunk.type === 'start') {
                result.query = chunk.query || '';
                result.url = chunk.url;
                setActiveRequestId(requestId);
            }
            else if (chunk.type === 'chunk' && chunk.chunk) {
                result.chunks.push(chunk.chunk);
            }
            else if (chunk.type === 'complete') {
                result.complete = true;
                result.summary = chunk.summary || result.chunks.join('');
                result.completedAt = chunk.timestamp;
                setActiveRequestId(null);
                toast.success('Research complete!');
            }
            newResults.set(requestId, result);
            return newResults;
        });
    }, []);
    /**
     * Submit research request
     */
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            toast.error('Please enter a query');
            return;
        }
        if (!isConnected || !wsRef.current) {
            toast.error('Not connected to bus');
            return;
        }
        const requestId = `req-${Date.now()}-${++requestCounterRef.current}`;
        const request = {
            id: requestId,
            query: query.trim(),
            timestamp: Date.now(),
        };
        // Publish request
        wsRef.current.send(JSON.stringify({
            type: 'publish',
            channel: REQUEST_CHANNEL,
            data: request,
        }));
        // Initialize result
        setResults(prev => {
            const newResults = new Map(prev);
            newResults.set(requestId, {
                requestId,
                query: request.query,
                chunks: [],
                complete: false,
                startedAt: Date.now(),
            });
            return newResults;
        });
        setActiveRequestId(requestId);
        setQuery('');
        toast.info('Research started...');
    }, [query, isConnected]);
    /**
     * Copy result
     */
    const handleCopy = useCallback(async (result) => {
        const text = result.summary || result.chunks.join('');
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard!');
        }
        catch {
            toast.error('Failed to copy');
        }
    }, []);
    const resultsArray = Array.from(results.values()).reverse(); // Newest first
    return (_jsxs("div", { className: "research-panel w-full h-full flex flex-col bg-gray-900 text-white", children: [_jsxs("div", { className: "p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Sparkles, { className: "w-5 h-5 text-blue-400" }), _jsx("h2", { className: "text-xl font-bold", children: "Research Assistant" }), _jsx("div", { className: `ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}` })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex gap-2", children: [_jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Ask a research question...", className: "flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: !isConnected }), _jsxs("button", { type: "submit", disabled: !isConnected || !query.trim(), className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4" }), "Research"] })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [resultsArray.length === 0 && (_jsxs("div", { className: "text-center text-gray-500 mt-8", children: [_jsx(Sparkles, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { children: "Enter a query to start researching" }), !isConnected && (_jsx("p", { className: "text-sm text-red-400 mt-2", children: "\u26A0\uFE0F Not connected to bus" }))] })), _jsx(AnimatePresence, { children: resultsArray.map((result) => (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "bg-gray-800 rounded-lg p-4 border border-gray-700", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-semibold text-lg mb-1", children: result.query }), result.url && (_jsx("p", { className: "text-sm text-gray-400 truncate", children: result.url }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [result.complete ? (_jsx(CheckCircle2, { className: "w-5 h-5 text-green-400" })) : (_jsx(Loader2, { className: "w-5 h-5 text-blue-400 animate-spin" })), _jsx("button", { onClick: () => handleCopy(result), className: "p-1.5 hover:bg-gray-700 rounded", title: "Copy", children: _jsx(Copy, { className: "w-4 h-4" }) })] })] }), _jsx("div", { className: "prose prose-invert max-w-none", children: result.complete ? (_jsx("p", { className: "text-gray-300 whitespace-pre-wrap", children: result.summary })) : (_jsxs("div", { className: "space-y-1", children: [result.chunks.map((chunk, idx) => (_jsx("span", { className: "text-gray-300", children: chunk }, idx))), _jsx("span", { className: "inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" })] })) }), _jsx("div", { className: "mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500", children: result.complete && result.completedAt ? (_jsxs("span", { children: ["Completed in ", ((result.completedAt - result.startedAt) / 1000).toFixed(1), "s"] })) : (_jsx("span", { children: "Streaming..." })) })] }, result.requestId))) })] })] }));
}
