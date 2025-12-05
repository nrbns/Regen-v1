/**
 * useBrowserAutomation Hook
 * React hook for browser automation via WebSocket
 */
interface BrowserEvent {
    type: string;
    payload: any;
    timestamp: number;
}
interface UseBrowserAutomationOptions {
    wsUrl?: string;
    sessionId?: string;
    tabId?: string;
    iframeId?: string;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    onConnect?: (sessionId: string) => void;
    onDisconnect?: () => void;
    onEvent?: (event: BrowserEvent) => void;
    onError?: (error: string) => void;
}
interface UseBrowserAutomationReturn {
    isConnected: boolean;
    sessionId: string | null;
    execute: (action: string, params?: any) => Promise<boolean>;
    getEvents: (limit?: number) => Promise<BrowserEvent[]>;
    getStats: () => Promise<any>;
    clearHistory: () => Promise<boolean>;
    sendMessage: (message: any) => void;
}
export declare function useBrowserAutomation(options?: UseBrowserAutomationOptions): UseBrowserAutomationReturn;
export {};
