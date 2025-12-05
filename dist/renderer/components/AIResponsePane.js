import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AIResponsePane - Streaming AI response display for search queries
 * Shows token-by-token streaming responses from Redix
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { requestRedix } from '../services/redixClient';
export function AIResponsePane({ query, isOpen, onClose }) {
    const [response, setResponse] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const controllerRef = useRef(null);
    const sessionIdRef = useRef(`redix-ai-${crypto.randomUUID()}`);
    const responseEndRef = useRef(null);
    // Auto-scroll to bottom as response streams
    useEffect(() => {
        if (responseEndRef.current && isStreaming) {
            responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [response, isStreaming]);
    // Stream AI response when query changes and pane is open
    useEffect(() => {
        if (!isOpen || !query.trim()) {
            return;
        }
        // Cancel any existing request
        controllerRef.current?.cancel();
        setResponse('');
        setError(null);
        setIsStreaming(true);
        // Start streaming request
        controllerRef.current = requestRedix(query, {
            sessionId: sessionIdRef.current,
            onPartial: (message) => {
                // Handle token-by-token streaming
                const payload = message.payload;
                // Check for text tokens in the response
                if (payload.text) {
                    setResponse((prev) => prev + payload.text);
                }
                else if (payload.content) {
                    setResponse((prev) => prev + payload.content);
                }
                else if (payload.items && Array.isArray(payload.items)) {
                    // Handle structured results
                    const textContent = payload.items
                        .map((item) => item.text || item.content || item.snippet || '')
                        .join('\n\n');
                    if (textContent) {
                        setResponse((prev) => {
                            // Avoid duplicates
                            if (!prev.includes(textContent)) {
                                return prev + (prev ? '\n\n' : '') + textContent;
                            }
                            return prev;
                        });
                    }
                }
            },
            onFinal: (message) => {
                setIsStreaming(false);
                const payload = message.payload;
                // Final response might contain complete text
                if (payload.text) {
                    setResponse((prev) => prev + payload.text);
                }
                else if (payload.content) {
                    setResponse((prev) => prev + payload.content);
                }
                else if (payload.items && Array.isArray(payload.items)) {
                    const textContent = payload.items
                        .map((item) => item.text || item.content || item.snippet || '')
                        .join('\n\n');
                    if (textContent && !response.includes(textContent)) {
                        setResponse((prev) => prev + (prev ? '\n\n' : '') + textContent);
                    }
                }
            },
            onError: (message) => {
                setIsStreaming(false);
                const errorMsg = message.payload?.message || 'Failed to get AI response';
                setError(errorMsg);
                console.error('[AIResponsePane] Redix error:', message);
            },
        });
        return () => {
            controllerRef.current?.cancel();
            controllerRef.current = null;
        };
    }, [query, isOpen]);
    const handleCopy = useCallback(async () => {
        if (!response)
            return;
        try {
            await navigator.clipboard.writeText(response);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch (error) {
            console.error('[AIResponsePane] Failed to copy:', error);
        }
    }, [response]);
    if (!isOpen)
        return null;
    return (_jsx(AnimatePresence, { children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, transition: { duration: 0.2 }, className: "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl mx-4 rounded-2xl border border-slate-700/70 bg-slate-950/95 backdrop-blur-xl shadow-2xl", style: { maxHeight: '60vh' }, children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-slate-800/60", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20", children: _jsx(Sparkles, { size: 16, className: "text-emerald-400" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-100", children: "AI Response" }), _jsx("p", { className: "text-xs text-gray-400 truncate max-w-md", children: query })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [response && (_jsx("button", { type: "button", onClick: handleCopy, className: "p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-slate-800/60 transition-colors", title: "Copy response", children: copied ? _jsx(Check, { size: 16 }) : _jsx(Copy, { size: 16 }) })), _jsx("button", { type: "button", onClick: onClose, className: "p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-slate-800/60 transition-colors", title: "Close", children: _jsx(X, { size: 16 }) })] })] }), _jsxs("div", { className: "px-6 py-4 overflow-y-auto", style: { maxHeight: 'calc(60vh - 80px)' }, children: [isStreaming && !response && (_jsxs("div", { className: "flex items-center gap-3 text-gray-400", children: [_jsx(Loader2, { size: 16, className: "animate-spin text-emerald-400" }), _jsx("span", { className: "text-sm", children: "Streaming response from Redix..." })] })), error && (_jsxs("div", { className: "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: [_jsx("p", { className: "font-medium", children: "Error" }), _jsx("p", { className: "mt-1 text-xs text-red-300/80", children: error })] })), response && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "prose prose-invert prose-sm max-w-none text-gray-200", children: [_jsxs("div", { className: "whitespace-pre-wrap break-words", children: [response, isStreaming && (_jsx("span", { className: "inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse" }))] }), _jsx("div", { ref: responseEndRef })] })), !response && !isStreaming && !error && (_jsxs("div", { className: "text-center py-8 text-gray-400", children: [_jsx(Sparkles, { size: 32, className: "mx-auto mb-3 opacity-50" }), _jsx("p", { className: "text-sm", children: "Waiting for AI response..." })] }))] })] }) }));
}
