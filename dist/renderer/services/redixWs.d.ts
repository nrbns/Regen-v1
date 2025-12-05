export type RedixMessage = {
    id?: string;
    type: string;
    payload?: Record<string, unknown>;
};
type Listener = (message: RedixMessage) => void;
type RequestOptions = {
    stream?: boolean;
    taskId?: string;
};
export declare class RedixWS {
    url: string;
    ws: WebSocket | null;
    listeners: Map<string, Listener>;
    backoff: number;
    private errorLogged;
    private isConnecting;
    private backendOnline;
    private unsubscribeBackend?;
    constructor(url?: string);
    connect(): void;
    send(message: RedixMessage): void;
    private startHttpStream;
    request(query: string, sessionId: string, options: RequestOptions | undefined, onMessage: Listener): {
        id: string;
        cancel: () => void;
    };
}
export declare const getRedixWS: () => RedixWS;
export declare const redixWS: RedixWS;
export {};
