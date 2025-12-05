/**
 * Game Mode Live Streaming Service - Telepathy Upgrade Phase 2
 * SSE stream tokens + vector results in same connection
 * Real-time AI recommendations and search results
 */
export interface GameStreamToken {
    type: 'token' | 'vector' | 'recommendation' | 'search_result';
    content: string;
    gameId?: string;
    score?: number;
    timestamp: number;
}
export type GameStreamCallback = (token: GameStreamToken) => void;
declare class GameModeStreamService {
    private eventSource;
    private callbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private currentQuery;
    private isConnected;
    /**
     * Stream game recommendations with live tokens + vectors
     */
    streamRecommendations(query: string, context: {
        favoriteGames?: string[];
        recentGames?: string[];
        favoriteCategories?: string[];
    }, callback: GameStreamCallback): () => void;
    /**
     * Connect to SSE endpoint
     */
    private connect;
    /**
     * Notify all callbacks
     */
    private notifyCallbacks;
    /**
     * Schedule reconnection
     */
    private scheduleReconnect;
    /**
     * Disconnect from SSE
     */
    private disconnect;
}
export declare function getGameModeStreamService(): GameModeStreamService;
export {};
