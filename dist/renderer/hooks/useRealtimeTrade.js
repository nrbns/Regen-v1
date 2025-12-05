import { useEffect, useRef, useState } from 'react';
export function useRealtimeTrade({ symbol, enabled = true, onTick, onCandle, }) {
    const [tick, setTick] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [orderbook, setOrderbook] = useState(null);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    useEffect(() => {
        if (!enabled || !symbol) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setConnected(false);
            return;
        }
        const connect = () => {
            try {
                // Use mock server in development, or configured WS host
                const wsUrl = import.meta.env.VITE_WS_HOST || 'localhost:4001';
                const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
                // Check if it's a full URL or just host:port
                // Mock server expects: ws://localhost:4001?symbol=...
                const url = wsUrl.includes('://')
                    ? `${wsUrl}?symbol=${encodeURIComponent(symbol)}`
                    : `${scheme}://${wsUrl}?symbol=${encodeURIComponent(symbol)}`;
                const ws = new WebSocket(url);
                wsRef.current = ws;
                ws.onopen = () => {
                    console.log('[useRealtimeTrade] WebSocket connected for', symbol);
                    setConnected(true);
                    setError(null);
                    reconnectAttempts.current = 0;
                };
                ws.onmessage = event => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'tick') {
                            const tickData = {
                                price: data.price,
                                volume: data.trade?.size || data.volume || 0,
                                timestamp: data.trade?.ts || data.timestamp || Date.now(),
                                bid: data.bid,
                                ask: data.ask,
                            };
                            setTick(tickData);
                            onTick?.(tickData);
                        }
                        else if (data.type === 'candle') {
                            const candle = data.candle || data;
                            const candleData = {
                                time: candle.time,
                                open: candle.open,
                                high: candle.high,
                                low: candle.low,
                                close: candle.close,
                                volume: candle.volume || 0,
                            };
                            onCandle?.(candleData);
                        }
                        else if (data.type === 'orderbook') {
                            // Update orderbook
                            if (data.bids && data.asks) {
                                setOrderbook({
                                    bids: data.bids,
                                    asks: data.asks,
                                });
                            }
                        }
                        else if (data.type === 'snapshot') {
                            // Handle initial snapshot with candles
                            if (data.candles && Array.isArray(data.candles)) {
                                data.candles.forEach((candle) => {
                                    const candleData = {
                                        time: candle.time,
                                        open: candle.open,
                                        high: candle.high,
                                        low: candle.low,
                                        close: candle.close,
                                        volume: candle.volume || 0,
                                    };
                                    onCandle?.(candleData);
                                });
                            }
                            // Set initial orderbook from snapshot
                            if (data.orderbook) {
                                setOrderbook({
                                    bids: data.orderbook.bids || [],
                                    asks: data.orderbook.asks || [],
                                });
                            }
                            // Set initial price from snapshot
                            if (data.lastPrice) {
                                const tickData = {
                                    price: data.lastPrice,
                                    volume: 0,
                                    timestamp: Date.now(),
                                };
                                setTick(tickData);
                                onTick?.(tickData);
                            }
                        }
                    }
                    catch (err) {
                        console.error('[useRealtimeTrade] Failed to parse message:', err);
                    }
                };
                ws.onerror = err => {
                    console.error('[useRealtimeTrade] WebSocket error:', err);
                    setError('Connection error');
                    setConnected(false);
                };
                ws.onclose = () => {
                    console.log('[useRealtimeTrade] WebSocket closed');
                    setConnected(false);
                    wsRef.current = null;
                    // Exponential backoff reconnection
                    if (enabled) {
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                        reconnectAttempts.current++;
                        reconnectTimeoutRef.current = setTimeout(() => {
                            connect();
                        }, delay);
                    }
                };
            }
            catch (err) {
                console.error('[useRealtimeTrade] Failed to create WebSocket:', err);
                setError('Failed to connect');
                setConnected(false);
            }
        };
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setConnected(false);
        };
    }, [symbol, enabled, onTick, onCandle]);
    return { tick, connected, error, orderbook };
}
