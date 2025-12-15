/**
 * React Hook for Orchestrator WebSocket
 * Provides real-time updates during plan execution
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface StatusUpdate {
  type: 'plan_created' | 'task_started' | 'task_completed' | 'task_failed' | 'plan_completed' | 'plan_failed' | 'subscribed' | 'unsubscribed' | 'pong';
  planId: string;
  taskId?: string;
  status?: string;
  progress?: number;
  message?: string;
  timestamp: Date;
  data?: any;
}

export interface UseOrchestratorWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface UseOrchestratorWebSocketReturn {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  
  // Subscription management
  subscribeToPlan: (planId: string) => void;
  unsubscribeFromPlan: (planId: string) => void;
  
  // Status updates
  lastUpdate: StatusUpdate | null;
  updates: StatusUpdate[];
  
  // Utility
  clearUpdates: () => void;
  ping: () => void;
}

export function useOrchestratorWebSocket(
  options: UseOrchestratorWebSocketOptions = {}
): UseOrchestratorWebSocketReturn {
  const {
    url = (() => {
      try {
        if (typeof window !== 'undefined' && window.location) {
          const isSecure = window.location.protocol === 'https:';
          return `${isSecure ? 'wss' : 'ws'}://${window.location.host}/ws/orchestrator`;
        }
      } catch {}
      // Fallback to common server port when not in browser context
      return 'ws://localhost:4000/ws/orchestrator';
    })(),
    autoConnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<StatusUpdate | null>(null);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[OrchestratorWS] Connected');
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Resubscribe to all plans
        subscriptionsRef.current.forEach((planId) => {
          ws.send(JSON.stringify({ type: 'subscribe', planId }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const update: StatusUpdate = JSON.parse(event.data);
          
          // Convert timestamp string to Date
          if (update.timestamp) {
            update.timestamp = new Date(update.timestamp);
          }

          setLastUpdate(update);
          
          // Don't store control messages
          if (!['subscribed', 'unsubscribed', 'pong'].includes(update.type)) {
            setUpdates((prev) => [...prev.slice(-99), update]); // Keep last 100
          }

          console.log('[OrchestratorWS] Update:', update.type, update.planId);
        } catch (err) {
          console.error('[OrchestratorWS] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[OrchestratorWS] Error:', event);
        setError('WebSocket error occurred');
      };

      ws.onclose = () => {
        console.log('[OrchestratorWS] Disconnected');
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[OrchestratorWS] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          setError('Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[OrchestratorWS] Connection error:', err);
      setError((err as Error).message);
      setConnecting(false);
    }
  }, [url, reconnectDelay, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    setConnected(false);
    setConnecting(false);
  }, [maxReconnectAttempts]);

  const subscribeToPlan = useCallback((planId: string) => {
    subscriptionsRef.current.add(planId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', planId }));
      console.log('[OrchestratorWS] Subscribed to plan:', planId);
    }
  }, []);

  const unsubscribeFromPlan = useCallback((planId: string) => {
    subscriptionsRef.current.delete(planId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', planId }));
      console.log('[OrchestratorWS] Unsubscribed from plan:', planId);
    }
  }, []);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setLastUpdate(null);
  }, []);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      ping();
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [connected, ping]);

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    subscribeToPlan,
    unsubscribeFromPlan,
    lastUpdate,
    updates,
    clearUpdates,
    ping,
  };
}

export default useOrchestratorWebSocket;
