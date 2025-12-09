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

const DEFAULT_WS_URL = (() => {
  const baseUrl = import.meta.env.VITE_WS_URL || 'localhost:4000/ws/browser-automation';
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const cleanUrl = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  return `${protocol}${cleanUrl}`;
})();

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
  const reconnectAttemptsRef = useRef<number>(0);

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
    
    // Only log in development to reduce console noise
    if (import.meta.env.DEV) {
      console.log('[useBrowserAutomation] Attempting to connect to:', url);
    }
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (error) {
      // Silently fail if WebSocket creation fails (e.g., server not available)
      if (import.meta.env.DEV) {
        const errorMsg = `Failed to create WebSocket: ${error instanceof Error ? error.message : String(error)}`;
        console.warn('[useBrowserAutomation]', errorMsg, '- Server may not be running');
      }
      // Don't call onError for connection failures - it's expected if server isn't running
      return;
    }
    
    wsRef.current = ws;

    ws.onopen = () => {
      if (import.meta.env.DEV) {
        console.log('[useBrowserAutomation] WebSocket connected');
      }
      reconnectAttemptsRef.current = 0; // Reset on successful connection
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

    ws.onclose = (event) => {
      // Only log in development
      if (import.meta.env.DEV && event.code !== 1006) {
        // 1006 is a normal close when server isn't available
        console.log('[useBrowserAutomation] WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
      }
      setIsConnected(false);
      onDisconnect?.();
      
      // Only auto-reconnect if it wasn't a clean close or if it was a connection error
      // But limit reconnection attempts to avoid spam
      if (autoReconnect && (!event.wasClean || event.code === 1006)) {
        // Exponential backoff: increase delay on each reconnect attempt
        const maxDelay = 30000; // Max 30 seconds
        const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current), maxDelay);
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (import.meta.env.DEV) {
            console.log('[useBrowserAutomation] Attempting to reconnect...');
          }
          connect();
        }, delay);
      }
    };

    ws.onerror = (event) => {
      // Only log errors in development to reduce console noise
      // WebSocket errors are expected if the server isn't running
      if (import.meta.env.DEV) {
        console.warn('[useBrowserAutomation] WebSocket connection failed', {
          url,
          readyState: ws.readyState,
          hint: 'Server may not be running on port 4000. This is expected if browser automation is not needed.',
        });
      }
      // Don't call onError - connection failures are expected when server isn't available
      // Don't close immediately - let onclose handle cleanup
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
          } catch {
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
          } catch {
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
          } catch {
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
          } catch {
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

