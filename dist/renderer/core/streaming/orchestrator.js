/**
 * Tauri Streaming Orchestrator
 * Real-time agent → partial → actions → execution
 * Supports both WebSocket and SSE
 */
import { useAgentStreamStore } from '../../state/agentStreamStore';
class StreamingOrchestrator {
    ws = null;
    eventSource = null;
    reconnectAttempts = 0;
    config = null;
    listeners = new Map();
    isConnected = false;
    currentRunId = null;
    // Message deduplication
    seenMessageIds = new Set();
    maxSeenSize = 1000;
    // Heartbeat
    heartbeatInterval = null;
    heartbeatIntervalMs = 20000;
    // Exponential backoff
    baseBackoff = 1000;
    maxBackoff = 30000;
    reconnectTimer = null;
    /**
     * Initialize streaming connection
     */
    async connect(config) {
        this.config = config;
        this.reconnectAttempts = 0;
        try {
            if (config.transport === 'websocket') {
                // Use the correct WebSocket path from server
                const wsUrl = config.url ||
                    (typeof window !== 'undefined' && window.__API_BASE_URL
                        ? window.__API_BASE_URL
                            .replace('http://', 'ws://')
                            .replace('https://', 'wss://') + '/agent/stream'
                        : 'ws://127.0.0.1:4000/agent/stream');
                await this.connectWebSocket(wsUrl);
            }
            else if (config.transport === 'sse') {
                await this.connectSSE(config.url || 'http://127.0.0.1:18080/sse');
            }
            else {
                // Event-based (Tauri events)
                this.isConnected = true;
                this.setupTauriEventListeners();
            }
        }
        catch (error) {
            console.error('[StreamingOrchestrator] Connection failed:', error);
            this.handleReconnect();
        }
    }
    /**
     * Connect via WebSocket
     */
    async connectWebSocket(url) {
        return new Promise((resolve, reject) => {
            try {
                // Add clientId and sessionId to URL for proper connection
                const urlObj = new URL(url);
                const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                const sessionId = `session-${Date.now()}`;
                urlObj.searchParams.set('clientId', clientId);
                urlObj.searchParams.set('sessionId', sessionId);
                const ws = new WebSocket(urlObj.toString());
                ws.onopen = () => {
                    console.log('[StreamingOrchestrator] WebSocket connected');
                    this.ws = ws;
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    // Start heartbeat
                    this.startHeartbeat();
                    resolve();
                };
                ws.onmessage = event => {
                    try {
                        const message = JSON.parse(event.data);
                        // Deduplicate messages
                        const messageId = message.id || `${message.runId}-${message.timestamp}-${message.type}`;
                        if (this.seenMessageIds.has(messageId)) {
                            console.log('[StreamingOrchestrator] Duplicate message ignored', { messageId });
                            return;
                        }
                        // Add to seen set
                        this.seenMessageIds.add(messageId);
                        // Limit seen set size
                        if (this.seenMessageIds.size > this.maxSeenSize) {
                            const firstId = this.seenMessageIds.values().next().value;
                            if (firstId !== undefined) {
                                this.seenMessageIds.delete(firstId);
                            }
                        }
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error('[StreamingOrchestrator] Failed to parse message:', error);
                    }
                };
                ws.onerror = error => {
                    console.error('[StreamingOrchestrator] WebSocket error:', error);
                    reject(error);
                };
                ws.onclose = () => {
                    console.log('[StreamingOrchestrator] WebSocket closed');
                    this.stopHeartbeat();
                    this.ws = null;
                    this.isConnected = false;
                    this.handleReconnect();
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Connect via Server-Sent Events (SSE)
     */
    async connectSSE(url) {
        return new Promise((resolve, reject) => {
            try {
                const eventSource = new EventSource(url);
                eventSource.onopen = () => {
                    console.log('[StreamingOrchestrator] SSE connected');
                    this.eventSource = eventSource;
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };
                eventSource.onmessage = event => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error('[StreamingOrchestrator] Failed to parse SSE message:', error);
                    }
                };
                eventSource.onerror = error => {
                    console.error('[StreamingOrchestrator] SSE error:', error);
                    if (eventSource.readyState === EventSource.CLOSED) {
                        this.eventSource = null;
                        this.isConnected = false;
                        this.handleReconnect();
                    }
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Setup Tauri event listeners (for event-based transport)
     */
    setupTauriEventListeners() {
        if (typeof window === 'undefined' || !window.__TAURI__) {
            console.warn('[StreamingOrchestrator] Tauri not available');
            return;
        }
        // Listen for agent events from Tauri backend
        window.__TAURI__.event.listen('agent-start', (event) => {
            this.handleMessage({
                type: 'start',
                runId: event.payload.runId || this.currentRunId || '',
                tabId: event.payload.tabId,
                sessionId: event.payload.sessionId,
                timestamp: Date.now(),
            });
        });
        window.__TAURI__.event.listen('agent-token', (event) => {
            this.handleMessage({
                type: 'step',
                runId: event.payload.runId || this.currentRunId || '',
                content: event.payload.content,
                timestamp: Date.now(),
            });
        });
        window.__TAURI__.event.listen('agent-action', (event) => {
            this.handleMessage({
                type: 'action',
                runId: event.payload.runId || this.currentRunId || '',
                action: event.payload.action,
                timestamp: Date.now(),
            });
        });
        window.__TAURI__.event.listen('agent-done', (event) => {
            this.handleMessage({
                type: 'done',
                runId: event.payload.runId || this.currentRunId || '',
                timestamp: Date.now(),
            });
        });
        window.__TAURI__.event.listen('agent-error', (event) => {
            this.handleMessage({
                type: 'error',
                runId: event.payload.runId || this.currentRunId || '',
                content: event.payload.error,
                timestamp: Date.now(),
            });
        });
    }
    /**
     * Handle incoming message
     */
    handleMessage(message) {
        // Update agent stream store
        const store = useAgentStreamStore.getState();
        // Only process messages for current active tab
        if (message.tabId && store.activeTabId && message.tabId !== store.activeTabId) {
            console.log('[StreamingOrchestrator] Ignoring message for inactive tab', {
                messageTabId: message.tabId,
                activeTabId: store.activeTabId,
            });
            return;
        }
        // Convert to AgentStreamEvent
        const event = {
            id: `${message.runId}-${Date.now()}`,
            type: message.type === 'start' ? 'start' : message.type === 'done' ? 'done' : 'step',
            step: message.step,
            status: message.status,
            content: message.content,
            timestamp: message.timestamp,
            tabId: message.tabId,
            sessionId: message.sessionId,
        };
        store.appendEvent(event);
        if (message.content) {
            store.appendTranscript(message.content);
        }
        // Notify listeners
        const listeners = this.listeners.get(message.type) || new Set();
        listeners.forEach(listener => listener(message));
    }
    /**
     * Start agent stream
     */
    async startAgent(query, options) {
        const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        this.currentRunId = runId;
        const store = useAgentStreamStore.getState();
        store.setRun(runId, query, options?.tabId);
        if (this.config?.transport === 'websocket' &&
            this.ws &&
            this.ws.readyState === WebSocket.OPEN) {
            // Send via WebSocket
            this.ws.send(JSON.stringify({
                type: 'start_agent',
                query,
                tabId: options?.tabId,
                sessionId: options?.sessionId,
                url: options?.url,
                context: options?.context,
                runId,
            }));
        }
        else if (this.config?.transport === 'event' &&
            typeof window !== 'undefined' &&
            window.__TAURI__) {
            // Invoke Tauri command
            window.__TAURI__
                .invoke('start_agent_stream', {
                query,
                tabId: options?.tabId,
                sessionId: options?.sessionId,
                url: options?.url,
                context: options?.context,
                runId,
            })
                .catch((error) => {
                console.error('[StreamingOrchestrator] Failed to start agent:', error);
                store.setError(error.message || 'Failed to start agent');
            });
        }
        else {
            // Fallback: use HTTP endpoint
            try {
                const response = await fetch('http://127.0.0.1:4000/api/agent/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        tabId: options?.tabId,
                        sessionId: options?.sessionId,
                        url: options?.url,
                        context: options?.context,
                        runId,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                // Handle SSE stream
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                if (reader) {
                    (async () => {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done)
                                break;
                            const chunk = decoder.decode(value);
                            const lines = chunk.split('\n');
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const message = JSON.parse(line.slice(6));
                                        this.handleMessage(message);
                                    }
                                    catch (error) {
                                        console.error('[StreamingOrchestrator] Failed to parse SSE line:', error);
                                    }
                                }
                            }
                        }
                    })();
                }
            }
            catch (error) {
                console.error('[StreamingOrchestrator] Failed to start agent:', error);
                store.setError(error.message || 'Failed to start agent');
            }
        }
        return runId;
    }
    /**
     * Stop agent stream
     */
    stopAgent(runId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'stop_agent', runId }));
        }
        const store = useAgentStreamStore.getState();
        store.setStatus('idle');
    }
    /**
     * Start heartbeat (ping/pong)
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now(),
                }));
            }
        }, this.heartbeatIntervalMs);
    }
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    /**
     * Handle reconnection with exponential backoff
     */
    handleReconnect() {
        if (!this.config?.reconnect) {
            return;
        }
        const maxAttempts = this.config.maxReconnectAttempts || 10;
        if (this.reconnectAttempts >= maxAttempts) {
            console.error('[StreamingOrchestrator] Max reconnect attempts reached');
            return;
        }
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.reconnectAttempts++;
        // Exponential backoff: baseBackoff * 2^(attempts-1), capped at maxBackoff
        const delay = Math.min(this.maxBackoff, this.baseBackoff * Math.pow(2, this.reconnectAttempts - 1));
        console.log(`[StreamingOrchestrator] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.config) {
                this.connect(this.config).catch(error => {
                    console.error('[StreamingOrchestrator] Reconnect failed:', error);
                });
            }
        }, delay);
    }
    /**
     * Add message listener
     */
    on(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(listener);
        // Return unsubscribe function
        return () => {
            this.listeners.get(type)?.delete(listener);
        };
    }
    /**
     * Disconnect
     */
    disconnect() {
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        this.listeners.clear();
        this.seenMessageIds.clear();
        this.reconnectAttempts = 0;
    }
    /**
     * Check if connected
     */
    get connected() {
        return this.isConnected;
    }
}
// Singleton instance
export const streamingOrchestrator = new StreamingOrchestrator();
