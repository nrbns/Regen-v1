/**
 * useBrowserAutomation Hook
 * React hook for browser automation via WebSocket
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface BrowserEvent {
  type: string;
  payload: any;
  timestamp: number;
}

interface UseBrowserAutomationOptions {
  wsUrl?: string;
  sessionId?: string;
  tabId?: string;
  iframeId?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  onConnect?: (sessionId: string) => void;
  onDisconnect?: () => void;
  onEvent?: (event: BrowserEvent) => void;
  onError?: (error: string) => void;
}

interface UseBrowserAutomationReturn {
  isConnected: boolean;
  sessionId: string | null;
  execute: (action: string, params?: any) => Promise<boolean>;
  getEvents: (limit?: number) => Promise<BrowserEvent[]>;
  getStats: () => Promise<any>;
  clearHistory: () => Promise<boolean>;
  sendMessage: (message: any) => void;
}

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws/browser-automation';

export function useBrowserAutomation(options: UseBrowserAutomationOptions = {}): UseBrowserAutomationReturn {
  const {
    wsUrl = DEFAULT_WS_URL,
    sessionId: initialSessionId,
    tabId,
    iframeId,
    autoReconnect = true,
    reconnectDelay = 3000,
    onConnect,
    onDisconnect,
    onEvent,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const currentSessionId = sessionId || `browser-automation-${Date.now()}`;
    setSessionId(currentSessionId);

    const urlParams = new URLSearchParams();
    urlParams.set('sessionId', currentSessionId);
    if (tabId) urlParams.set('tabId', tabId);
    if (iframeId) urlParams.set('iframeId', iframeId);

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
      } catch (err) {
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

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
    }
  }, []);

  const execute = useCallback(async (action: string, params?: any): Promise<boolean> => {
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
            } else if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          } catch (err) {
            if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          }
        };

        sendMessage({ type: 'execute', action, params });
      } else {
        resolve(false);
      }
    });
  }, [sendMessage]);

  const getEvents = useCallback(async (limit: number = 10): Promise<BrowserEvent[]> => {
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
            } else if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          } catch (err) {
            if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          }
        };

        sendMessage({ type: 'get_events', params: { limit } });
      } else {
        resolve([]);
      }
    });
  }, [sendMessage]);

  const getStats = useCallback(async (): Promise<any> => {
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
            } else if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          } catch (err) {
            if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          }
        };

        sendMessage({ type: 'get_stats' });
      } else {
        resolve({});
      }
    });
  }, [sendMessage]);

  const clearHistory = useCallback(async (): Promise<boolean> => {
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
            } else if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          } catch (err) {
            if (originalOnMessage && wsRef.current) {
              originalOnMessage.call(wsRef.current, event);
            }
          }
        };

        sendMessage({ type: 'clear' });
      } else {
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

