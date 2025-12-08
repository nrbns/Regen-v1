import { useEffect, useRef, useState } from 'react';
export function useRealtimeTrade({ symbol, enabled = true, onTick, onCandle, }) {
    const [tick, setTick] = useState(null);
    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
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
                // Use backend server WebSocket, or configured WS host
                const wsBase = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_HOST || 'ws://localhost:4000';
                const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
                // Backend server expects: ws://localhost:4000/ws?symbol=...
                let url;
                if (wsBase.includes('://')) {
                    // Full URL provided
                    url = `${wsBase.replace(/^https?:/, scheme === 'wss' ? 'wss' : 'ws')}/ws?symbol=${encodeURIComponent(symbol)}`;
                }
                else {
                    // Just host:port
                    url = `${scheme}://${wsBase}/ws?symbol=${encodeURIComponent(symbol)}`;
                }
                const ws = new WebSocket(url);
                wsRef.current = ws;
                ws.onopen = () => {
                    console.log('[useRealtimeTrade] WebSocket connected for', symbol);
                    setConnected(true);
                    setReconnecting(false);
                    setError(null);
                    reconnectAttempts.current = 0;
                    // Emit connection event for UI
                    window.dispatchEvent(new CustomEvent('ws-connected', { detail: { symbol } }));
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
                        setReconnecting(true);
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                        reconnectAttempts.current++;
                        console.log(`[useRealtimeTrade] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
                        reconnectTimeoutRef.current = setTimeout(() => {
                            connect();
                        }, delay);
                        // Emit disconnection event for UI
                        window.dispatchEvent(new CustomEvent('ws-disconnected', { detail: { symbol, reconnecting: true } }));
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
    return { tick, connected, reconnecting, error, orderbook };
}
