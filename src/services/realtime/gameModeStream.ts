/**
 * Game Mode Live Streaming Service - Telepathy Upgrade Phase 2
 * SSE stream tokens + vector results in same connection
 * Real-time AI recommendations and search results
 */

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (window as any).__API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
    : 'http://127.0.0.1:4000';

export interface GameStreamToken {
  type: 'token' | 'vector' | 'recommendation' | 'search_result';
  content: string;
  gameId?: string;
  score?: number;
  timestamp: number;
}

export type GameStreamCallback = (token: GameStreamToken) => void;

class GameModeStreamService {
  private eventSource: EventSource | null = null;
  private callbacks: Set<GameStreamCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentQuery: string | null = null;
  private isConnected = false;

  /**
   * Stream game recommendations with live tokens + vectors
   */
  streamRecommendations(
    query: string,
    context: {
      favoriteGames?: string[];
      recentGames?: string[];
      favoriteCategories?: string[];
    },
    callback: GameStreamCallback
  ): () => void {
    this.callbacks.add(callback);
    this.currentQuery = query;

    if (!this.isConnected) {
      this.connect(query, context);
    }

    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Connect to SSE endpoint
   */
  private connect(
    query: string,
    context: {
      favoriteGames?: string[];
      recentGames?: string[];
      favoriteCategories?: string[];
    }
  ): void {
    this.disconnect();

    // Build query params
    const params = new URLSearchParams({
      q: query,
      ...(context.favoriteGames && { favorites: context.favoriteGames.join(',') }),
      ...(context.recentGames && { recent: context.recentGames.join(',') }),
      ...(context.favoriteCategories && { categories: context.favoriteCategories.join(',') }),
    });

    const url = `${API_BASE_URL}/games/stream?${params.toString()}`;
    console.log('[GameModeStream] Connecting to', url);

    try {
      this.eventSource = new EventSource(url);
      this.reconnectAttempts = 0;

      this.eventSource.onopen = () => {
        console.log('[GameModeStream] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = event => {
        try {
          // Handle SSE ping
          if (event.data === ': ping' || event.data.trim() === '') {
            return;
          }

          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'token') {
            const token: GameStreamToken = {
              type: 'token',
              content: data.content || '',
              timestamp: data.timestamp || Date.now(),
            };
            this.notifyCallbacks(token);
          } else if (data.type === 'vector') {
            const token: GameStreamToken = {
              type: 'vector',
              content: data.content || '',
              gameId: data.gameId,
              score: data.score,
              timestamp: data.timestamp || Date.now(),
            };
            this.notifyCallbacks(token);
          } else if (data.type === 'recommendation') {
            const token: GameStreamToken = {
              type: 'recommendation',
              content: data.content || '',
              gameId: data.gameId,
              score: data.score,
              timestamp: data.timestamp || Date.now(),
            };
            this.notifyCallbacks(token);
          } else if (data.type === 'search_result') {
            const token: GameStreamToken = {
              type: 'search_result',
              content: data.content || '',
              gameId: data.gameId,
              score: data.score,
              timestamp: data.timestamp || Date.now(),
            };
            this.notifyCallbacks(token);
          } else if (data.type === 'done') {
            console.log('[GameModeStream] Stream complete');
            this.disconnect();
          } else if (data.type === 'error') {
            console.error('[GameModeStream] Stream error', data.message);
            this.disconnect();
          }
        } catch (error) {
          console.error('[GameModeStream] Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = error => {
        console.error('[GameModeStream] SSE error:', error);
        this.eventSource?.close();
        this.scheduleReconnect(query, context);
      };
    } catch (error) {
      console.error('[GameModeStream] Failed to create EventSource:', error);
      this.scheduleReconnect(query, context);
    }
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(token: GameStreamToken): void {
    this.callbacks.forEach(cb => {
      try {
        cb(token);
      } catch (error) {
        console.error('[GameModeStream] Callback error', error);
      }
    });
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(
    query: string,
    context: {
      favoriteGames?: string[];
      recentGames?: string[];
      favoriteCategories?: string[];
    }
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[GameModeStream] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`[GameModeStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.callbacks.size > 0 && this.currentQuery === query) {
        this.connect(query, context);
      }
    }, delay);
  }

  /**
   * Disconnect from SSE
   */
  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }
}

// Singleton instance
let instance: GameModeStreamService | null = null;

export function getGameModeStreamService(): GameModeStreamService {
  if (!instance) {
    instance = new GameModeStreamService();
  }
  return instance;
}
