/**
 * useTradeStream Hook
 * React hook for real-time trade data and order management
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface OHLC {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}

interface Trade {
  symbol: string;
  timestamp: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  status: 'pending' | 'processing' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number;
  filledQuantity?: number;
  averageFillPrice?: number;
}

interface UseTradeStreamOptions {
  sessionId?: string;
  wsUrl?: string;
  autoReconnect?: boolean;
  onOHLC?: (data: OHLC) => void;
  onOrderBook?: (data: OrderBook) => void;
  onTrade?: (data: Trade) => void;
  onOrderUpdate?: (order: Order) => void;
  onError?: (error: string) => void;
}

interface UseTradeStreamReturn {
  isConnected: boolean;
  subscribe: (symbol: string) => Promise<void>;
  unsubscribe: (symbol: string) => Promise<void>;
  placeOrder: (order: Partial<Order>, idempotencyKey?: string) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<Order>;
  getOrders: (symbol?: string) => Promise<Order[]>;
  historical: OHLC[];
  orderbook: OrderBook | null;
  latestPrice: number | null;
}

const DEFAULT_WS_URL = (() => {
  const baseUrl = import.meta.env.VITE_WS_URL || 'localhost:4000/ws/trade';
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const cleanUrl = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  return `${protocol}${cleanUrl}`;
})();

export function useTradeStream(options: UseTradeStreamOptions = {}): UseTradeStreamReturn {
  const {
    sessionId: initialSessionId,
    wsUrl = DEFAULT_WS_URL,
    autoReconnect = true,
    onOHLC,
    onOrderBook,
    onTrade,
    onOrderUpdate,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [historical, setHistorical] = useState<OHLC[]>([]);
  const [orderbook, setOrderbook] = useState<OrderBook | null>(null);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(initialSessionId || `trade-${Date.now()}`);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const url = `${wsUrl}?sessionId=${sessionIdRef.current}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useTradeStream] WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'connected':
            console.log('[useTradeStream] Connected to trade stream');
            break;

          case 'historical':
            setHistorical(message.data);
            break;

          case 'ohlc':
            onOHLC?.(message.data);
            if (message.data.close) {
              setLatestPrice(message.data.close);
            }
            break;

          case 'orderbook':
            setOrderbook(message.data);
            onOrderBook?.(message.data);
            break;

          case 'trade':
            onTrade?.(message.data);
            break;

          case 'order:created':
          case 'order:updated':
            onOrderUpdate?.(message.order);
            break;

          case 'order:error':
            onError?.(message.error);
            break;

          case 'subscribed':
            subscriptionsRef.current.add(message.symbol);
            break;

          case 'unsubscribed':
            subscriptionsRef.current.delete(message.symbol);
            break;
        }
      } catch (error) {
        console.error('[useTradeStream] Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[useTradeStream] WebSocket disconnected');
      setIsConnected(false);
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[useTradeStream] Attempting to reconnect...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = error => {
      console.error('[useTradeStream] WebSocket error:', error);
      onError?.('WebSocket connection error');
    };
  }, [wsUrl, autoReconnect, onOHLC, onOrderBook, onTrade, onOrderUpdate, onError]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  /**
   * Subscribe to symbol
   */
  const subscribe = useCallback(async (symbol: string): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'subscribed' && message.symbol === symbol) {
            wsRef.current?.removeEventListener('message', handler);
            resolve();
          } else if (message.type === 'error') {
            wsRef.current?.removeEventListener('message', handler);
            reject(new Error(message.message));
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        return;
      }

      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          symbol,
        })
      );
    });
  }, []);

  /**
   * Unsubscribe from symbol
   */
  const unsubscribe = useCallback(async (symbol: string): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'unsubscribe',
        symbol,
      })
    );
  }, []);

  /**
   * Place order
   */
  const placeOrder = useCallback(
    async (order: Partial<Order>, idempotencyKey?: string): Promise<Order> => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }

      return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'order:placed') {
              wsRef.current?.removeEventListener('message', handler);
              resolve(message.order);
            } else if (message.type === 'order:error') {
              wsRef.current?.removeEventListener('message', handler);
              reject(new Error(message.error));
            }
          } catch {
            // Ignore parse errors
          }
        };

        if (!wsRef.current) {
          return;
        }

        wsRef.current.addEventListener('message', handler);
        wsRef.current.send(
          JSON.stringify({
            type: 'place_order',
            order,
            idempotencyKey,
          })
        );
      });
    },
    []
  );

  /**
   * Cancel order
   */
  const cancelOrder = useCallback(async (orderId: string): Promise<Order> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'order:cancelled') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(message.order);
          } else if (message.type === 'order:error') {
            wsRef.current?.removeEventListener('message', handler);
            reject(new Error(message.error));
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        return;
      }

      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(
        JSON.stringify({
          type: 'cancel_order',
          order: { id: orderId },
        })
      );
    });
  }, []);

  /**
   * Get orders
   */
  const getOrders = useCallback(async (symbol?: string): Promise<Order[]> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return [];
    }

    return new Promise(resolve => {
      const handler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'orders') {
            wsRef.current?.removeEventListener('message', handler);
            resolve(message.orders || []);
          }
        } catch {
          // Ignore parse errors
        }
      };

      if (!wsRef.current) {
        return;
      }

      wsRef.current.addEventListener('message', handler);
      wsRef.current.send(
        JSON.stringify({
          type: 'get_orders',
          symbol,
        })
      );
    });
  }, []);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    placeOrder,
    cancelOrder,
    getOrders,
    historical,
    orderbook,
    latestPrice,
  };
}
