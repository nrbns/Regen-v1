/**
 * Voice Action Service - Telepathy Upgrade Phase 2
 * WebSocket → Rust handler → instant tab command pipeline
 * Voice → action <1.2s latency
 */
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:18080';
class VoiceActionService {
    ws = null;
    callbacks = new Set();
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    reconnectDelay = 1000;
    reconnectTimeout = null;
    isConnected = false;
    pendingActions = new Map();
    /**
     * Send voice command and get instant action response
     */
    async sendVoiceCommand(text, mode) {
        return new Promise((resolve, reject) => {
            const requestId = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            // Store promise handlers
            this.pendingActions.set(requestId, { resolve, reject });
            // Connect if needed
            if (!this.isConnected) {
                this.connect()
                    .then(() => {
                    this.sendCommand(text, mode, requestId);
                })
                    .catch(reject);
            }
            else {
                this.sendCommand(text, mode, requestId);
            }
            // Timeout after 2 seconds
            setTimeout(() => {
                if (this.pendingActions.has(requestId)) {
                    this.pendingActions.delete(requestId);
                    reject(new Error('Voice command timeout'));
                }
            }, 2000);
        });
    }
    /**
     * Send command via WebSocket
     */
    sendCommand(text, mode, requestId) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            const pending = this.pendingActions.get(requestId);
            if (pending) {
                this.pendingActions.delete(requestId);
                pending.reject(new Error('WebSocket not connected'));
            }
            return;
        }
        this.ws.send(JSON.stringify({
            type: 'voice_command',
            requestId,
            text,
            mode: mode || 'browse',
            timestamp: Date.now(),
        }));
    }
    /**
     * Subscribe to voice actions
     */
    subscribe(callback) {
        this.callbacks.add(callback);
        if (!this.isConnected) {
            this.connect();
        }
        return () => {
            this.callbacks.delete(callback);
            if (this.callbacks.size === 0) {
                this.disconnect();
            }
        };
    }
    /**
     * Connect to WebSocket server
     */
    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        const wsUrl = `${WS_URL}/voice_actions`;
        console.log('[VoiceActionService] Connecting to', wsUrl);
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = () => {
                    console.log('[VoiceActionService] Connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };
                this.ws.onmessage = event => {
                    try {
                        const data = JSON.parse(event.data);
                        // Handle response to a specific request
                        if (data.requestId && this.pendingActions.has(data.requestId)) {
                            const pending = this.pendingActions.get(data.requestId);
                            this.pendingActions.delete(data.requestId);
                            if (data.type === 'voice_action') {
                                pending.resolve(data.action);
                            }
                            else if (data.type === 'error') {
                                pending.reject(new Error(data.message || 'Voice command failed'));
                            }
                            return;
                        }
                        // Handle broadcast actions
                        if (data.type === 'voice_action') {
                            const action = {
                                command: data.action.command,
                                action: data.action.action,
                                params: data.action.params || {},
                                timestamp: data.action.timestamp || Date.now(),
                            };
                            this.callbacks.forEach(cb => {
                                try {
                                    cb(action);
                                }
                                catch (error) {
                                    console.error('[VoiceActionService] Callback error', error);
                                }
                            });
                        }
                    }
                    catch (error) {
                        console.error('[VoiceActionService] Failed to parse message', error);
                    }
                };
                this.ws.onerror = error => {
                    console.error('[VoiceActionService] WebSocket error', error);
                    reject(error);
                };
                this.ws.onclose = () => {
                    console.log('[VoiceActionService] WebSocket closed');
                    this.isConnected = false;
                    this.scheduleReconnect();
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Schedule reconnection
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[VoiceActionService] Max reconnect attempts reached');
            return;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[VoiceActionService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimeout = setTimeout(() => {
            if (this.callbacks.size > 0 || this.pendingActions.size > 0) {
                this.connect().catch(console.error);
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
export function getVoiceActionService() {
    if (!instance) {
        instance = new VoiceActionService();
    }
    return instance;
}
