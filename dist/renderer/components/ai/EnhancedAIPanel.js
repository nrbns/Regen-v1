import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * EnhancedAIPanel - AI Assistant Panel with Smart Actions and Voice Input
 * Based on Figma UI/UX Prototype Flow redesign
 */
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, X, Loader2, Copy, Check } from 'lucide-react';
import { SmartActionGroup } from './SmartActionButton';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import VoiceButton from '../VoiceButton';
export function EnhancedAIPanel({ onClose, initialQuery = '' }) {
    const [query, setQuery] = useState(initialQuery);
    const [response, setResponse] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [smartActions, setSmartActions] = useState([]);
    const responseEndRef = useRef(null);
    const { activeId, tabs } = useTabsStore();
    const activeTab = tabs.find(t => t.id === activeId);
    // Auto-scroll to bottom as response streams
    useEffect(() => {
        if (responseEndRef.current && isStreaming) {
            responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [response, isStreaming]);
    // Generate smart actions from response
    useEffect(() => {
        if (!response || isStreaming) {
            setSmartActions([]);
            return;
        }
        // Extract potential actions from response
        const actions = [];
        // Check for URLs in response
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = response.match(urlRegex) || [];
        urls.slice(0, 3).forEach((url, idx) => {
            actions.push({
                id: `navigate-${idx}`,
                type: 'navigate',
                label: 'Open URL',
                description: url,
                onClick: async () => {
                    await ipc.tabs.create(url);
                },
            });
        });
        // Add research action if query is research-related
        if (query.toLowerCase().includes('research') || query.toLowerCase().includes('find')) {
            actions.push({
                id: 'research',
                type: 'research',
                label: 'Research This',
                description: 'Start research session',
                onClick: async () => {
                    // Trigger research mode
                    const { useAppStore } = await import('../../state/appStore');
                    useAppStore.getState().setMode('Research');
                },
            });
        }
        // Add copy action
        if (response.length > 0) {
            actions.push({
                id: 'copy',
                type: 'copy',
                label: 'Copy Response',
                onClick: async () => {
                    await navigator.clipboard.writeText(response);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                },
            });
        }
        setSmartActions(actions);
    }, [response, query, isStreaming]);
    const handleSubmit = async () => {
        if (!query.trim() || isStreaming)
            return;
        setError(null);
        setResponse('');
        setIsStreaming(true);
        setSmartActions([]);
        try {
            // Stream AI response
            await ipc.redix.stream(query, {
                sessionId: `ai-panel-${Date.now()}`,
            }, (chunk) => {
                if (chunk.type === 'token' && chunk.text) {
                    setResponse(prev => prev + chunk.text);
                }
                else if (chunk.type === 'done') {
                    setIsStreaming(false);
                }
                else if (chunk.type === 'error') {
                    setIsStreaming(false);
                    setError(chunk.error || 'Failed to get AI response');
                }
            });
        }
        catch (err) {
            console.error('[EnhancedAIPanel] Error:', err);
            setIsStreaming(false);
            setError('Failed to get AI response. Please try again.');
        }
    };
    const handleVoiceResult = (text) => {
        setQuery(text);
        // Auto-submit after voice input
        setTimeout(() => {
            handleSubmit();
        }, 300);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-900/95 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-800/50", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20", children: _jsx(Sparkles, { size: 16, className: "text-emerald-400" }) }), _jsx("h3", { className: "text-sm font-semibold text-gray-100", children: "AI Assistant" })] }), onClose && (_jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors", children: _jsx(X, { size: 16 }) }))] }), _jsxs("div", { className: "p-4 border-b border-gray-800/50 space-y-3", children: [_jsxs("div", { className: "flex items-end gap-2", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx("textarea", { value: query, onChange: e => setQuery(e.target.value), onKeyDown: handleKeyDown, placeholder: "Ask AI assistant... (or use voice input)", className: "w-full px-4 py-3 pr-12 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 resize-none", rows: 3, disabled: isStreaming }), _jsx("div", { className: "absolute bottom-3 right-3 flex items-center gap-2", children: query && (_jsx("button", { onClick: handleSubmit, disabled: isStreaming || !query.trim(), className: "p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", title: "Send (Enter)", children: isStreaming ? (_jsx(Loader2, { size: 14, className: "animate-spin" })) : (_jsx(Send, { size: 14 })) })) })] }), _jsx("div", { className: "flex flex-col gap-2", children: _jsx(VoiceButton, { onResult: handleVoiceResult, small: true }) })] }), activeTab && (_jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-2 px-2", children: [_jsx("span", { children: "Context:" }), _jsx("span", { className: "text-gray-400 truncate", children: activeTab.title || activeTab.url })] }))] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [isStreaming && !response && (_jsxs("div", { className: "flex items-center gap-3 text-gray-400 py-8", children: [_jsx(Loader2, { size: 16, className: "animate-spin text-emerald-400" }), _jsx("span", { className: "text-sm", children: "AI is thinking..." })] })), error && (_jsxs("div", { className: "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200", children: [_jsx("p", { className: "font-medium", children: "Error" }), _jsx("p", { className: "mt-1 text-xs text-red-300/80", children: error })] })), response && (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "space-y-4", children: [_jsxs("div", { className: "prose prose-invert prose-sm max-w-none text-gray-200", children: [_jsxs("div", { className: "whitespace-pre-wrap break-words", children: [response, isStreaming && (_jsx("span", { className: "inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse" }))] }), _jsx("div", { ref: responseEndRef })] }), smartActions.length > 0 && (_jsxs("div", { className: "pt-4 border-t border-gray-800/50", children: [_jsx("div", { className: "text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide", children: "Quick Actions" }), _jsx(SmartActionGroup, { actions: smartActions })] })), response && (_jsx("div", { className: "flex items-center justify-end pt-2", children: _jsx("button", { onClick: async () => {
                                        await navigator.clipboard.writeText(response);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }, className: "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-gray-100 transition-colors", children: copied ? (_jsxs(_Fragment, { children: [_jsx(Check, { size: 14 }), _jsx("span", { children: "Copied!" })] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { size: 14 }), _jsx("span", { children: "Copy" })] })) }) }))] })), !response && !isStreaming && !error && (_jsxs("div", { className: "text-center py-12 text-gray-400", children: [_jsx(Sparkles, { size: 32, className: "mx-auto mb-3 opacity-50" }), _jsx("p", { className: "text-sm mb-1", children: "Ask me anything" }), _jsx("p", { className: "text-xs text-gray-500", children: "I can help with research, explanations, navigation, and more" })] }))] })] }));
}
