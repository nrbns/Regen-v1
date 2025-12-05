/**
 * Regen Real-Time WebSocket Client
 * Connects to backend and handles real-time events
 */
export type RegenSocketEvent = RegenMessageEvent | RegenStatusEvent | RegenCommandEvent | RegenNotificationEvent | RegenErrorEvent;
export interface BaseEvent {
    id: string;
    clientId: string;
    sessionId: string;
    timestamp: number;
    version: 1;
}
export interface RegenMessageEvent extends BaseEvent {
    type: 'message';
    role: 'assistant' | 'user';
    mode: 'research' | 'trade' | 'browser' | 'automation' | 'handsFree';
    language: string;
    text: string;
    done?: boolean;
}
export interface RegenStatusEvent extends BaseEvent {
    type: 'status';
    phase: 'planning' | 'searching' | 'scraping' | 'calling_workflow' | 'executing_command' | 'idle';
    detail?: string;
}
export interface RegenCommandEvent extends BaseEvent {
    type: 'command';
    command: {
        kind: 'OPEN_TAB';
        url: string;
        background?: boolean;
    } | {
        kind: 'SCROLL';
        tabId: string;
        amount: number;
    } | {
        kind: 'CLICK_ELEMENT';
        tabId: string;
        elementId: string;
        selector?: string;
    } | {
        kind: 'GO_BACK';
        tabId: string;
    } | {
        kind: 'GO_FORWARD';
        tabId: string;
    } | {
        kind: 'SWITCH_TAB';
        tabId: string;
    } | {
        kind: 'CLOSE_TAB';
        tabId: string;
    } | {
        kind: 'SPEAK';
        text: string;
        language: string;
    } | {
        kind: 'STOP_SPEAKING';
    } | {
        kind: 'TYPE_INTO_ELEMENT';
        tabId: string;
        selector: string;
        text: string;
    };
}
export interface RegenNotificationEvent extends BaseEvent {
    type: 'notification';
    level: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
}
export interface RegenErrorEvent extends BaseEvent {
    type: 'error';
    code: string;
    message: string;
    recoverable?: boolean;
}
type EventHandler = (event: RegenSocketEvent) => void;
declare class RegenSocketClient {
    private socket;
    private clientId;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private isReconnecting;
    private handlers;
    private messageBuffer;
    constructor(clientId?: string);
    /**
     * Connect to WebSocket server
     */
    connect(sessionId?: string): Promise<void>;
    /**
     * Attempt to reconnect
     */
    private attemptReconnect;
    /**
     * Handle incoming event
     */
    private handleEvent;
    /**
     * Handle Regen commands
     */
    private handleCommand;
    /**
     * Subscribe to events
     */
    on(eventType: string, handler: EventHandler): void;
    /**
     * Unsubscribe from events
     */
    off(eventType: string, handler: EventHandler): void;
    /**
     * Emit event to handlers
     */
    private emit;
    /**
     * Send message to server
     */
    send(message: Record<string, unknown>): void;
    /**
     * Disconnect
     */
    disconnect(): void;
    /**
     * Get client ID
     */
    getClientId(): string;
    /**
     * Check if connected
     */
    isConnected(): boolean;
}
/**
 * Get or create socket instance
 */
export declare function getRegenSocket(clientId?: string): RegenSocketClient;
/**
 * Connect Regen socket
 */
export declare function connectRegenSocket(sessionId?: string): Promise<void>;
export default RegenSocketClient;
