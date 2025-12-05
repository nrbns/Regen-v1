/**
 * Tauri Streaming Orchestrator
 * Real-time agent → partial → actions → execution
 * Supports both WebSocket and SSE
 */
export type StreamTransport = 'websocket' | 'sse' | 'event';
export interface StreamConfig {
    transport: StreamTransport;
    url?: string;
    reconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
}
export interface AgentMessage {
    type: 'start' | 'step' | 'action' | 'done' | 'error';
    runId: string;
    tabId?: string | null;
    sessionId?: string | null;
    content?: string;
    step?: number;
    status?: string;
    action?: {
        type: string;
        args: Record<string, unknown>;
    };
    timestamp: number;
    id?: string;
}
declare class StreamingOrchestrator {
    private ws;
    private eventSource;
    private reconnectAttempts;
    private config;
    private listeners;
    private isConnected;
    private currentRunId;
    private seenMessageIds;
    private maxSeenSize;
    private heartbeatInterval;
    private heartbeatIntervalMs;
    private baseBackoff;
    private maxBackoff;
    private reconnectTimer;
    /**
     * Initialize streaming connection
     */
    connect(config: StreamConfig): Promise<void>;
    /**
     * Connect via WebSocket
     */
    private connectWebSocket;
    /**
     * Connect via Server-Sent Events (SSE)
     */
    private connectSSE;
    /**
     * Setup Tauri event listeners (for event-based transport)
     */
    private setupTauriEventListeners;
    /**
     * Handle incoming message
     */
    private handleMessage;
    /**
     * Start agent stream
     */
    startAgent(query: string, options?: {
        tabId?: string | null;
        sessionId?: string | null;
        url?: string;
        context?: string;
    }): Promise<string>;
    /**
     * Stop agent stream
     */
    stopAgent(runId: string): void;
    /**
     * Start heartbeat (ping/pong)
     */
    private startHeartbeat;
    /**
     * Stop heartbeat
     */
    private stopHeartbeat;
    /**
     * Handle reconnection with exponential backoff
     */
    private handleReconnect;
    /**
     * Add message listener
     */
    on(type: string, listener: (data: AgentMessage) => void): () => void;
    /**
     * Disconnect
     */
    disconnect(): void;
    /**
     * Check if connected
     */
    get connected(): boolean;
}
export declare const streamingOrchestrator: StreamingOrchestrator;
export {};
