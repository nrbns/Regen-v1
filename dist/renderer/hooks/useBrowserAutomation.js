/**
 * useBrowserAutomation Hook
 * React hook for browser automation via WebSocket
 */
import { useState, useEffect, useRef, useCallback } from 'react';
const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws/browser-automation';
export function useBrowserAutomation(options = {}) {
    const { wsUrl = DEFAULT_WS_URL, sessionId: initialSessionId, tabId, iframeId, autoReconnect = true, reconnectDelay = 3000, onConnect, onDisconnect, onEvent, onError, } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [sessionId, setSessionId] = useState(initialSessionId || null);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const messageQueueRef = useRef([]);
    const connect = useCallback(() => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }
        const currentSessionId = sessionId || `browser-automation-${Date.now()}`;
        setSessionId(currentSessionId);
        const urlParams = new URLSearchParams();
        urlParams.set('sessionId', currentSessionId);
        if (tabId)
            urlParams.set('tabId', tabId);
        if (iframeId)
            urlParams.set('iframeId', iframeId);
        const url = `${wsUrl}?${urlParams.toString()}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('[useBrowserAutomation] WebSocket connected');
            setIsConnected(true);
            onConnect?.(currentSessionId);
            // Send any queued messages
            while (messageQueueRef.current.length > 0) {
                const queuedMessage = messageQueueRef.current.shift();
                ws.send(JSON.stringify(queuedMessage));
            }
        };
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'connected':
                        setSessionId(message.sessionId);
                        break;
                    case 'browser:event':
                        onEvent?.(message.event);
                        break;
                    case 'action:executed':
                        // Action executed successfully
                        break;
                    case 'events':
                        // Events retrieved
                        break;
                    case 'stats':
                        // Stats retrieved
                        break;
                    case 'error':
                        onError?.(message.message);
                        break;
                }
            }
            catch (err) {
                console.error('[useBrowserAutomation] Error parsing message:', err);
                onError?.(`Failed to parse message: ${err instanceof Error ? err.message : String(err)}`);
            }
        };
        ws.onclose = () => {
            console.log('[useBrowserAutomation] WebSocket disconnected');
            setIsConnected(false);
            onDisconnect?.();
            if (autoReconnect) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('[useBrowserAutomation] Attempting to reconnect...');
                    connect();
                }, reconnectDelay);
            }
        };
        ws.onerror = (event) => {
            console.error('[useBrowserAutomation] WebSocket error:', event);
            onError?.('WebSocket connection error');
            ws.close();
        };
    }, [wsUrl, sessionId, tabId, iframeId, autoReconnect, reconnectDelay, onConnect, onDisconnect, onEvent, onError]);
    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);
    const sendMessage = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
        else {
            messageQueueRef.current.push(message);
        }
    }, []);
    const execute = useCallback(async (action, params) => {
        return new Promise((resolve) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const originalOnMessage = wsRef.current.onmessage;
                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'action:executed' || message.type === 'error') {
                            resolve(message.type === 'action:executed');
                            if (wsRef.current && originalOnMessage) {
                                wsRef.current.onmessage = originalOnMessage;
                            }
                        }
                        else if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                    catch {
                        if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                };
                sendMessage({ type: 'execute', action, params });
            }
            else {
                resolve(false);
            }
        });
    }, [sendMessage]);
    const getEvents = useCallback(async (limit = 10) => {
        return new Promise((resolve) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const originalOnMessage = wsRef.current.onmessage;
                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'events') {
                            resolve(message.events || []);
                            if (wsRef.current && originalOnMessage) {
                                wsRef.current.onmessage = originalOnMessage;
                            }
                        }
                        else if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                    catch {
                        if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                };
                sendMessage({ type: 'get_events', params: { limit } });
            }
            else {
                resolve([]);
            }
        });
    }, [sendMessage]);
    const getStats = useCallback(async () => {
        return new Promise((resolve) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const originalOnMessage = wsRef.current.onmessage;
                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'stats') {
                            resolve(message.stats || {});
                            if (wsRef.current && originalOnMessage) {
                                wsRef.current.onmessage = originalOnMessage;
                            }
                        }
                        else if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                    catch {
                        if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                };
                sendMessage({ type: 'get_stats' });
            }
            else {
                resolve({});
            }
        });
    }, [sendMessage]);
    const clearHistory = useCallback(async () => {
        return new Promise((resolve) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const originalOnMessage = wsRef.current.onmessage;
                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'cleared' || message.type === 'error') {
                            resolve(message.type === 'cleared');
                            if (wsRef.current && originalOnMessage) {
                                wsRef.current.onmessage = originalOnMessage;
                            }
                        }
                        else if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                    catch {
                        if (originalOnMessage && wsRef.current) {
                            originalOnMessage.call(wsRef.current, event);
                        }
                    }
                };
                sendMessage({ type: 'clear' });
            }
            else {
                resolve(false);
            }
        });
    }, [sendMessage]);
    return {
        isConnected,
        sessionId,
        execute,
        getEvents,
        getStats,
        clearHistory,
        sendMessage,
    };
}
