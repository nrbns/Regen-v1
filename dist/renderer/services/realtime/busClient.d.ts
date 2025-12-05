/**
 * Realtime Bus Client
 * Frontend WebSocket client for message bus
 * PR: Frontend-bus integration
 */
export interface BusMessage {
    type: 'message' | 'connected' | 'subscribed' | 'published' | 'error' | 'history';
    channel?: string;
    data?: any;
    timestamp?: number;
    sender?: string;
}
export type MessageHandler = (message: BusMessage) => void;
declare class BusClient {
    private ws;
    private subscribers;
    private reconnectTimer;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    /**
     * Connect to bus
     */
    connect(): Promise<void>;
    /**
     * Disconnect from bus
     */
    disconnect(): void;
    /**
     * Subscribe to channel
     */
    subscribe(channel: string, handler: MessageHandler): () => void;
    /**
     * Publish message to channel
     */
    publish(channel: string, data: any): Promise<number>;
    /**
     * Handle incoming message
     */
    private handleMessage;
    /**
     * Get connection status
     */
    get connected(): boolean;
}
export declare const busClient: BusClient;
export {};
