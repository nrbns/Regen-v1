/**
 * Regen Real-Time WebSocket Client
 * Connects to backend and handles real-time events
 */
import { v4 as uuidv4 } from 'uuid';
import { ipc } from '../ipc-typed';
class RegenSocketClient {
    socket = null;
    clientId;
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    reconnectDelay = 2000;
    isReconnecting = false;
    handlers = new Map();
    messageBuffer = ''; // For streaming messages
    constructor(clientId) {
        this.clientId = clientId || `client-${uuidv4()}`;
    }
    /**
     * Connect to WebSocket server
     */
    connect(sessionId) {
        return new Promise((resolve, reject) => {
            // Prevent multiple connection attempts
            if (this.socket &&
                (this.socket.readyState === WebSocket.OPEN ||
                    this.socket.readyState === WebSocket.CONNECTING)) {
                console.log('[RegenSocket] Already connected or connecting');
                resolve();
                return;
            }
            // Use window.location for WebSocket URL in Electron
            const wsUrl = import.meta.env.VITE_REDIX_URL || 'ws://localhost:4000';
            const url = `${wsUrl}/agent/stream?clientId=${this.clientId}${sessionId ? `&sessionId=${sessionId}` : ''}`;
            try {
                this.socket = new WebSocket(url);
                // Set connection timeout
                const timeout = setTimeout(() => {
                    if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
                        this.socket.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000); // 10 second timeout
                this.socket.onopen = () => {
                    clearTimeout(timeout);
                    console.log('[RegenSocket] Connected', { clientId: this.clientId });
                    this.reconnectAttempts = 0;
                    this.isReconnecting = false;
                    this.emit('connected', {});
                    resolve();
                };
                this.socket.onmessage = ev => {
                    try {
                        const event = JSON.parse(ev.data);
                        this.handleEvent(event);
                    }
                    catch (error) {
                        console.error('[RegenSocket] Failed to parse event', error);
                    }
                };
                this.socket.onclose = event => {
                    clearTimeout(timeout);
                    console.log('[RegenSocket] Disconnected', { code: event.code, reason: event.reason });
                    this.emit('disconnected', {});
                    // Only attempt reconnect if not a manual close
                    if (event.code !== 1000) {
                        this.attemptReconnect(sessionId);
                    }
                };
                this.socket.onerror = error => {
                    clearTimeout(timeout);
                    console.error('[RegenSocket] Error', error);
                    this.emit('error', {
                        id: uuidv4(),
                        clientId: this.clientId,
                        sessionId: sessionId || '',
                        type: 'error',
                        code: 'WEBSOCKET_ERROR',
                        message: 'WebSocket connection error',
                        timestamp: Date.now(),
                        version: 1,
                    });
                    reject(error);
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Attempt to reconnect
     */
    attemptReconnect(sessionId) {
        if (this.isReconnecting)
            return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[RegenSocket] Max reconnect attempts reached');
            this.emit('reconnect_failed', {});
            return;
        }
        this.isReconnecting = true;
        this.reconnectAttempts++;
        console.log(`[RegenSocket] Reconnecting (attempt ${this.reconnectAttempts})...`);
        setTimeout(() => {
            this.connect(sessionId).catch(() => {
                this.isReconnecting = false;
            });
        }, this.reconnectDelay * this.reconnectAttempts);
    }
    /**
     * Handle incoming event
     */
    handleEvent(event) {
        // Emit to specific type handlers
        this.emit(event.type, event);
        // Emit to all handlers
        this.emit('*', event);
        // Handle commands immediately
        if (event.type === 'command') {
            this.handleCommand(event.command);
        }
    }
    /**
     * Handle Regen commands
     */
    async handleCommand(cmd) {
        try {
            switch (cmd.kind) {
                case 'OPEN_TAB':
                    await ipc.regen.openTab({ url: cmd.url, background: cmd.background });
                    break;
                case 'SCROLL':
                    await ipc.regen.scroll({ tabId: cmd.tabId, amount: cmd.amount });
                    break;
                case 'CLICK_ELEMENT':
                    if (cmd.selector) {
                        await ipc.regen.clickElement({ tabId: cmd.tabId, selector: cmd.selector });
                    }
                    break;
                case 'GO_BACK':
                    await ipc.regen.goBack({ tabId: cmd.tabId });
                    break;
                case 'GO_FORWARD':
                    await ipc.regen.goForward({ tabId: cmd.tabId });
                    break;
                case 'SWITCH_TAB':
                    await ipc.regen.switchTab({ id: cmd.tabId });
                    break;
                case 'CLOSE_TAB':
                    await ipc.regen.closeTab({ tabId: cmd.tabId });
                    break;
                case 'TYPE_INTO_ELEMENT':
                    await ipc.regen.typeIntoElement({
                        tabId: cmd.tabId,
                        selector: cmd.selector,
                        text: cmd.text,
                    });
                    break;
                case 'SPEAK':
                    // Use browser TTS
                    if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(cmd.text);
                        utterance.lang = cmd.language;
                        window.speechSynthesis.speak(utterance);
                    }
                    break;
                case 'STOP_SPEAKING':
                    if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                    }
                    break;
            }
        }
        catch (error) {
            console.error('[RegenSocket] Command execution failed', { cmd, error });
        }
    }
    /**
     * Subscribe to events
     */
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
    }
    /**
     * Unsubscribe from events
     */
    off(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }
    /**
     * Emit event to handlers
     */
    emit(eventType, event) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                }
                catch (error) {
                    console.error('[RegenSocket] Handler error', { eventType, error });
                }
            });
        }
    }
    /**
     * Send message to server
     */
    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
        else {
            console.warn('[RegenSocket] Cannot send message, socket not open');
        }
    }
    /**
     * Disconnect
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    /**
     * Get client ID
     */
    getClientId() {
        return this.clientId;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }
}
// Singleton instance
let socketInstance = null;
/**
 * Get or create socket instance
 */
export function getRegenSocket(clientId) {
    if (!socketInstance) {
        socketInstance = new RegenSocketClient(clientId);
    }
    return socketInstance;
}
/**
 * Connect Regen socket
 */
export function connectRegenSocket(sessionId) {
    const socket = getRegenSocket();
    return socket.connect(sessionId);
}
export default RegenSocketClient;
