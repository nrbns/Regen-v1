import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Cursor AI Chat Component
 * Displays streaming chat interface with Cursor AI
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, X, Settings, Code, FileText, ExternalLink, AlertCircle, } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { showToast } from '../../state/toastStore';
export function CursorChat({ pageSnapshot, editorState, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [currentJobId, setCurrentJobId] = useState(null);
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);
    // Check API key on mount
    useEffect(() => {
        checkApiKey();
    }, []);
    // Listen for streaming chunks
    useEffect(() => {
        const handleStream = (event) => {
            if (event.jobId !== currentJobId)
                return;
            const chunk = event.chunk;
            if (chunk.type === 'token') {
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant' && last.streaming) {
                        return [
                            ...prev.slice(0, -1),
                            {
                                ...last,
                                content: last.content + chunk.data,
                            },
                        ];
                    }
                    return prev;
                });
            }
            else if (chunk.type === 'patch') {
                // Handle code patches
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant') {
                        return [
                            ...prev.slice(0, -1),
                            {
                                ...last,
                                patches: [
                                    ...(last.patches || []),
                                    chunk.data,
                                ],
                            },
                        ];
                    }
                    return prev;
                });
            }
            else if (chunk.type === 'citation') {
                // Handle citations
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant') {
                        return [
                            ...prev.slice(0, -1),
                            {
                                ...last,
                                citations: [
                                    ...(last.citations || []),
                                    chunk.data,
                                ],
                            },
                        ];
                    }
                    return prev;
                });
            }
            else if (chunk.type === 'done') {
                setIsStreaming(false);
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant' && last.streaming) {
                        return [
                            ...prev.slice(0, -1),
                            {
                                ...last,
                                streaming: false,
                            },
                        ];
                    }
                    return prev;
                });
            }
            else if (chunk.type === 'error') {
                setIsStreaming(false);
                showToast('error', `Cursor error: ${chunk.data}`);
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.streaming) {
                        return [
                            ...prev.slice(0, -1),
                            {
                                ...last,
                                streaming: false,
                                content: last.content + `\n\n[Error: ${chunk.data}]`,
                            },
                        ];
                    }
                    return prev;
                });
            }
        };
        // @ts-ignore - Electron IPC
        window.electron?.ipcRenderer?.on('cursor:stream', handleStream);
        return () => {
            // @ts-ignore
            window.electron?.ipcRenderer?.removeListener('cursor:stream', handleStream);
        };
    }, [currentJobId]);
    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const checkApiKey = async () => {
        try {
            const result = await ipc.cursor.checkApiKey();
            setHasApiKey(result.hasKey);
        }
        catch (error) {
            console.error('[CursorChat] Failed to check API key', error);
            setHasApiKey(false);
        }
    };
    const handleSetApiKey = async () => {
        if (!apiKeyInput.trim()) {
            showToast('error', 'API key cannot be empty');
            return;
        }
        try {
            await ipc.cursor.setApiKey({ apiKey: apiKeyInput.trim() });
            setHasApiKey(true);
            setShowSettings(false);
            setApiKeyInput('');
            showToast('success', 'API key saved securely');
        }
        catch (error) {
            console.error('[CursorChat] Failed to set API key', error);
            showToast('error', 'Failed to save API key');
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isStreaming || !hasApiKey)
            return;
        const question = input.trim();
        setInput('');
        // Add user message
        const userMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: question,
            timestamp: Date.now(),
        };
        // Add assistant placeholder
        const assistantMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            streaming: true,
        };
        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setIsStreaming(true);
        try {
            const response = await ipc.cursor.query({
                question,
                pageSnapshot,
                editorState,
                useWebSocket: false, // Use SSE for now
            });
            setCurrentJobId(response.jobId);
        }
        catch (error) {
            console.error('[CursorChat] Query failed', error);
            showToast('error', error instanceof Error ? error.message : 'Query failed');
            setIsStreaming(false);
            setMessages(prev => prev.slice(0, -1)); // Remove assistant placeholder
        }
    };
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsStreaming(false);
        setCurrentJobId(null);
    };
    const handleClearHistory = async () => {
        try {
            await ipc.cursor.clearHistory();
            setMessages([]);
            showToast('success', 'Conversation history cleared');
        }
        catch (error) {
            console.error('[CursorChat] Failed to clear history', error);
        }
    };
    if (hasApiKey === null) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx(Loader2, { className: "animate-spin text-blue-500", size: 24 }) }));
    }
    if (!hasApiKey) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center p-8 space-y-4", children: [_jsx(AlertCircle, { className: "text-yellow-500", size: 48 }), _jsx("h3", { className: "text-lg font-semibold text-gray-200", children: "Cursor API Key Required" }), _jsx("p", { className: "text-sm text-gray-400 text-center max-w-md", children: "Please configure your Cursor API key to use the AI assistant. Your key will be stored securely using your OS keychain." }), _jsx("button", { onClick: () => setShowSettings(true), className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition", children: "Configure API Key" })] }));
    }
    return (_jsxs("div", { className: "flex flex-col h-full bg-slate-900/60 border border-slate-700/70 rounded-xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-slate-700/70", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bot, { className: "text-blue-400", size: 20 }), _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Cursor AI" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [(pageSnapshot || editorState) && (_jsxs("div", { className: "flex items-center gap-1 text-xs text-gray-400", children: [pageSnapshot && _jsx(FileText, { size: 12 }), editorState && _jsx(Code, { size: 12 })] })), _jsx("button", { onClick: () => setShowSettings(true), className: "p-1.5 rounded hover:bg-slate-800 transition", title: "Settings", children: _jsx(Settings, { size: 16, className: "text-gray-400" }) }), onClose && (_jsx("button", { onClick: onClose, className: "p-1.5 rounded hover:bg-slate-800 transition", title: "Close", children: _jsx(X, { size: 16, className: "text-gray-400" }) }))] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [messages.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center space-y-2", children: [_jsx(Bot, { className: "text-gray-500", size: 48 }), _jsx("p", { className: "text-sm text-gray-400", children: "Ask Cursor AI anything about this page or code" })] })), _jsx(AnimatePresence, { children: messages.map(msg => (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                    ? 'bg-blue-600/80 text-white'
                                    : 'bg-slate-800/80 text-gray-200'}`, children: [_jsx("p", { className: "text-sm whitespace-pre-wrap", children: msg.content }), msg.streaming && (_jsx("span", { className: "inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" })), msg.citations && msg.citations.length > 0 && (_jsx("div", { className: "mt-2 pt-2 border-t border-slate-700 space-y-1", children: msg.citations.map((cite, idx) => (_jsxs("a", { href: cite.url || cite.file, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-blue-300 hover:text-blue-200 flex items-center gap-1", children: [_jsx(ExternalLink, { size: 12 }), cite.file || cite.url] }, idx))) }))] }) }, msg.id))) }), _jsx("div", { ref: messagesEndRef })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-4 border-t border-slate-700/70 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: input, onChange: e => setInput(e.target.value), placeholder: "Ask Cursor AI...", disabled: isStreaming, className: "flex-1 px-3 py-2 bg-slate-800/80 border border-slate-700/70 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50" }), isStreaming ? (_jsx("button", { type: "button", onClick: handleCancel, className: "px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-700 transition", children: "Cancel" })) : (_jsx("button", { type: "submit", disabled: !input.trim(), className: "px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: _jsx(Send, { size: 16 }) }))] }), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [_jsx("button", { type: "button", onClick: handleClearHistory, className: "hover:text-gray-400 transition", children: "Clear history" }), _jsxs("span", { children: [messages.length, " messages"] })] })] }), showSettings && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", onClick: () => setShowSettings(false), children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4", onClick: e => e.stopPropagation(), children: [_jsx("h3", { className: "text-lg font-semibold text-gray-200 mb-4", children: "Cursor API Key" }), _jsx("p", { className: "text-sm text-gray-400 mb-4", children: "Your API key will be stored securely using your OS keychain." }), _jsx("input", { type: "password", value: apiKeyInput, onChange: e => setApiKeyInput(e.target.value), placeholder: "Enter Cursor API key", className: "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-200 mb-4 focus:outline-none focus:border-blue-500" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: handleSetApiKey, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition", children: "Save" }), _jsx("button", { onClick: () => {
                                        setShowSettings(false);
                                        setApiKeyInput('');
                                    }, className: "px-4 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition", children: "Cancel" })] })] }) }))] }));
}
