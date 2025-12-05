import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Regen Sidebar Component
 * The AI brain of Regen - chat + voice interface
 */
import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Loader2, X, Search, TrendingUp, Wifi, WifiOff, } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';
import { HandsFreeMode } from './HandsFreeMode';
// RegenCommand type is now handled by RegenSocket client
export function RegenSidebar() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [handsFreeMode, setHandsFreeMode] = useState(false);
    const [mode, setMode] = useState('research');
    const [sessionId] = useState(() => `regen-${Date.now()}`);
    const [isConnected] = useState(false);
    const [_currentStatus, _setCurrentStatus] = useState('');
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const socketRef = useRef(null);
    const { tabs, activeId } = useTabsStore();
    const activeTab = tabs.find(t => t.id === activeId);
    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map((result) => result[0]?.transcript)
                    .join(' ')
                    .trim();
                if (transcript) {
                    setInput(transcript);
                    handleSend(transcript);
                }
                setIsListening(false);
            };
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                toast.error('Voice recognition failed. Please try again.');
                setIsListening(false);
            };
            recognition.onend = () => {
                setIsListening(false);
            };
            recognitionRef.current = recognition;
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);
    // Track pending confirmation
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    const handleSend = async (text) => {
        const messageText = text || input.trim();
        if (!messageText)
            return;
        // Handle confirmation responses
        if (pendingConfirmation) {
            const lower = messageText.toLowerCase().trim();
            const confirmed = lower === 'yes' || lower === 'y' || lower === 'confirm';
            if (confirmed || lower === 'no' || lower === 'n' || lower === 'cancel') {
                try {
                    const result = await ipc.regen.tradeConfirm({
                        orderId: pendingConfirmation.orderId,
                        confirmed,
                        pendingOrder: pendingConfirmation.pendingOrder,
                    });
                    const confirmationMessage = {
                        id: `msg-${Date.now()}`,
                        role: 'assistant',
                        content: confirmed
                            ? `✅ Order placed successfully! Order ID: ${result.orderId || 'N/A'}`
                            : '❌ Order cancelled.',
                        timestamp: Date.now(),
                    };
                    setMessages(prev => [...prev, confirmationMessage]);
                    setPendingConfirmation(null);
                }
                catch (error) {
                    console.error('[Regen] Trade confirmation failed:', error);
                    toast.error('Failed to process trade confirmation');
                }
                setInput('');
                return;
            }
        }
        setIsLoading(true);
        setInput('');
        // Add user message
        const userMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMessage]);
        try {
            // Send query via HTTP (response streams via WebSocket)
            const socket = socketRef.current;
            const clientId = socket?.getClientId() || `client-${Date.now()}`;
            // Create placeholder message for streaming
            const placeholderMessage = {
                id: `msg-${Date.now()}-streaming`,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                done: false,
            };
            setMessages(prev => [...prev, placeholderMessage]);
            const response = await fetch('http://localhost:4000/api/agent/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    sessionId,
                    message: messageText,
                    mode,
                    source: text ? 'voice' : 'text',
                    tabId: activeTab?.id,
                    context: activeTab
                        ? {
                            url: activeTab.url,
                            title: activeTab.title,
                        }
                        : undefined,
                }),
            });
            if (!response.ok) {
                throw new Error('Query failed');
            }
            // Response is streamed via WebSocket, so we don't need to process HTTP response
            // The WebSocket handler above will receive the streaming events and update messages
            // Commands are also executed automatically via WebSocket command events
        }
        catch (error) {
            console.error('[Regen] Query failed:', error);
            toast.error('Failed to get response from Regen');
            const errorMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleVoiceToggle = () => {
        if (!recognitionRef.current) {
            toast.error('Voice recognition not available in this browser');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
        else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-900 border-l border-gray-700", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-5 h-5 text-blue-500" }), _jsx("h2", { className: "text-lg font-semibold text-gray-200", children: "Regen" }), isConnected ? (_jsx(Wifi, { className: "w-4 h-4 text-green-500", "aria-label": "Connected" })) : (_jsx(WifiOff, { className: "w-4 h-4 text-red-500", "aria-label": "Disconnected" }))] }), _jsx("button", { onClick: async () => {
                            // Close sidebar via appStore
                            const { useAppStore } = await import('../../state/appStore');
                            useAppStore.getState().setRegenSidebarOpen(false);
                        }, className: "text-gray-400 hover:text-gray-300 transition-colors", "aria-label": "Close", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "flex gap-2 p-3 border-b border-gray-700", children: [_jsxs("button", { onClick: () => setMode('research'), className: `flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${mode === 'research'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`, children: [_jsx(Search, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-medium", children: "Research" })] }), _jsxs("button", { onClick: () => setMode('trade'), className: `flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${mode === 'trade'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`, children: [_jsx(TrendingUp, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-medium", children: "Trade" })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [messages.length === 0 && (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(Sparkles, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "Ask me anything or use voice commands" }), _currentStatus && _jsx("p", { className: "text-xs mt-2 text-blue-400", children: _currentStatus }), _jsx("p", { className: "text-xs mt-2 text-gray-500", children: mode === 'research' ? (_jsxs(_Fragment, { children: ["Try: \"Find 5 best brokers for intraday trading in India and give detailed pros/cons\"", _jsx("br", {}), "or \"Compare Zerodha, Upstox, Angel One for intraday trading\""] })) : (_jsxs(_Fragment, { children: ["Try: \"Buy 10 shares of TCS at market\"", _jsx("br", {}), "or \"Set SL at 1% and target 3%\""] })) })] })), messages.map(msg => (_jsx("div", { className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`, children: [_jsx("p", { className: "text-sm whitespace-pre-wrap", children: msg.content }), msg.commands && msg.commands.length > 0 && (_jsxs("div", { className: "mt-2 text-xs opacity-75", children: [msg.commands.length, " command(s) executed"] }))] }) }, msg.id))), isLoading && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "bg-gray-800 rounded-lg px-4 py-2", children: _jsx(Loader2, { className: "w-4 h-4 animate-spin text-gray-400" }) }) })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "px-4 py-2 border-t border-gray-700 flex items-center justify-between bg-gray-800/50", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Hands-Free Mode" }), _jsx("button", { onClick: () => setHandsFreeMode(!handsFreeMode), className: `relative w-10 h-5 rounded-full transition-colors ${handsFreeMode ? 'bg-blue-600' : 'bg-gray-700'}`, "aria-label": "Toggle hands-free mode", children: _jsx("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${handsFreeMode ? 'translate-x-5' : 'translate-x-0'}` }) })] }), handsFreeMode && (_jsxs("div", { className: "text-xs text-blue-400 animate-pulse flex items-center gap-1", children: [_jsx(Mic, { className: "w-3 h-3" }), _jsx("span", { children: "Listening..." })] }))] }), _jsx("div", { className: "p-4 border-t border-gray-700", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: handleVoiceToggle, className: `p-2 rounded transition-colors ${isListening ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`, "aria-label": isListening ? 'Stop listening' : 'Start voice input', children: isListening ? _jsx(MicOff, { className: "w-5 h-5" }) : _jsx(Mic, { className: "w-5 h-5" }) }), _jsx("input", { type: "text", value: input, onChange: e => setInput(e.target.value), onKeyPress: handleKeyPress, placeholder: "Ask Regen anything...", className: "flex-1 bg-gray-800 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: isLoading }), _jsx("button", { onClick: () => handleSend(), disabled: isLoading || !input.trim(), className: "p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", "aria-label": "Send", children: _jsx(Send, { className: "w-5 h-5" }) })] }) }), handsFreeMode && (_jsx(HandsFreeMode, { sessionId: sessionId, mode: mode, onCommand: async (cmd) => {
                    // Execute browser commands
                    try {
                        switch (cmd.type) {
                            case 'OPEN_TAB':
                                if (cmd.payload.url) {
                                    await ipc.regen.openTab({ url: cmd.payload.url });
                                }
                                break;
                            case 'SCROLL':
                                if (cmd.payload.tabId) {
                                    await ipc.regen.scroll({
                                        tabId: cmd.payload.tabId,
                                        amount: cmd.payload.amount || 500,
                                    });
                                }
                                break;
                            case 'CLICK_ELEMENT':
                                if (cmd.payload.tabId && cmd.payload.elementId) {
                                    await ipc.regen.clickElement({
                                        tabId: cmd.payload.tabId,
                                        selector: cmd.payload.elementId,
                                    });
                                }
                                break;
                            case 'GO_BACK':
                                if (activeTab?.id) {
                                    await ipc.tabs.goBack(activeTab.id);
                                }
                                break;
                            case 'GO_FORWARD':
                                if (activeTab?.id) {
                                    await ipc.tabs.goForward(activeTab.id);
                                }
                                break;
                        }
                    }
                    catch (error) {
                        console.error('[HandsFree] Command execution failed:', error);
                    }
                }, onClose: () => setHandsFreeMode(false) }))] }));
}
