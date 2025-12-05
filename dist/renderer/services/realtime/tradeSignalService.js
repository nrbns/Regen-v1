/**
 * Trade Signal Service - Telepathy Upgrade Phase 2
 * WebSocket push for instant trade signals (replaces 30s polling)
 * Push the moment scanner detects signals
 */
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:18080';
class TradeSignalService {
    ws = null;
    callbacks = new Set();
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    reconnectDelay = 1000;
    reconnectTimeout = null;
    subscribedSymbols = new Set();
    isConnected = false;
    /**
     * Subscribe to trade signals for a symbol
     */
    subscribe(symbol, callback) {
        const normalizedSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
        this.callbacks.add(callback);
        this.subscribedSymbols.add(normalizedSymbol);
        // Connect if not already connected
        if (!this.isConnected) {
            this.connect();
        }
        else {
            // Subscribe to this symbol immediately
            this.subscribeToSymbol(normalizedSymbol);
        }
        // Return unsubscribe function
        return () => {
            this.callbacks.delete(callback);
            this.subscribedSymbols.delete(normalizedSymbol);
            // Unsubscribe from symbol if no more callbacks
            if (this.callbacks.size === 0) {
                this.disconnect();
            }
        };
    }
    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        const wsUrl = `${WS_URL}/trade_signals`;
        console.log('[TradeSignalService] Connecting to', wsUrl);
        try {
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                console.log('[TradeSignalService] Connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                // Subscribe to all pending symbols
                this.subscribedSymbols.forEach(symbol => {
                    this.subscribeToSymbol(symbol);
                });
            };
            this.ws.onmessage = event => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'trade_signal') {
                        const signal = {
                            symbol: data.symbol,
                            action: data.action,
                            confidence: data.confidence || 0,
                            reason: data.reason || '',
                            timestamp: data.timestamp || Date.now(),
                        };
                        // Notify all callbacks
                        this.callbacks.forEach(cb => {
                            try {
                                cb(signal);
                            }
                            catch (error) {
                                console.error('[TradeSignalService] Callback error', error);
                            }
                        });
                    }
                    else if (data.type === 'error') {
                        console.error('[TradeSignalService] Server error', data.message);
                    }
                }
                catch (error) {
                    console.error('[TradeSignalService] Failed to parse message', error);
                }
            };
            this.ws.onerror = error => {
                console.error('[TradeSignalService] WebSocket error', error);
            };
            this.ws.onclose = () => {
                console.log('[TradeSignalService] WebSocket closed');
                this.isConnected = false;
                this.scheduleReconnect();
            };
        }
        catch (error) {
            console.error('[TradeSignalService] Failed to create WebSocket', error);
            this.scheduleReconnect();
        }
    }
    /**
     * Subscribe to a specific symbol
     */
    subscribeToSymbol(symbol) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        this.ws.send(JSON.stringify({
            type: 'subscribe',
            symbol,
        }));
        console.log('[TradeSignalService] Subscribed to', symbol);
    }
    /**
     * Schedule reconnection
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[TradeSignalService] Max reconnect attempts reached');
            return;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        console.log(`[TradeSignalService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimeout = setTimeout(() => {
            if (this.callbacks.size > 0) {
                this.connect();
            }
        }, delay);
    }
    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}
// Singleton instance
let instance = null;
export function getTradeSignalService() {
    if (!instance) {
        instance = new TradeSignalService();
    }
    return instance;
}
