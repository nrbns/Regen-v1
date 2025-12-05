/**
 * Voice Action Service - Telepathy Upgrade Phase 2
 * WebSocket → Rust handler → instant tab command pipeline
 * Voice → action <1.2s latency
 */
export interface VoiceAction {
    command: string;
    action: 'open_tab' | 'close_tab' | 'switch_tab' | 'navigate' | 'search' | 'scroll' | 'click' | 'type';
    params: Record<string, any>;
    timestamp: number;
}
export type VoiceActionCallback = (action: VoiceAction) => void;
declare class VoiceActionService {
    private ws;
    private callbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private reconnectTimeout;
    private isConnected;
    private pendingActions;
    /**
     * Send voice command and get instant action response
     */
    sendVoiceCommand(text: string, mode?: string): Promise<VoiceAction>;
    /**
     * Send command via WebSocket
     */
    private sendCommand;
    /**
     * Subscribe to voice actions
     */
    subscribe(callback: VoiceActionCallback): () => void;
    /**
     * Connect to WebSocket server
     */
    private connect;
    /**
     * Schedule reconnection
     */
    private scheduleReconnect;
    /**
     * Disconnect from WebSocket
     */
    private disconnect;
}
export declare function getVoiceActionService(): VoiceActionService;
export {};
