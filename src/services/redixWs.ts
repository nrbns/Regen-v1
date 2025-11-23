const DEFAULT_WS_URL = import.meta.env.VITE_REDIX_WS_URL || 'ws://localhost:4000/ws';
const DEFAULT_HTTP_URL = import.meta.env.VITE_REDIX_HTTP_URL || 'http://localhost:4000/api/query';
const DEFAULT_SSE_URL = import.meta.env.VITE_REDIX_SSE_URL || 'http://localhost:4000/api/ask';

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

export class RedixWS {
  url: string;
  ws: WebSocket | null = null;
  listeners: Map<string, Listener> = new Map();
  backoff = 1000;
  private errorLogged = false;
  private isConnecting = false;

  constructor(url: string = DEFAULT_WS_URL) {
    this.url = url;
    // Defer connection attempt to avoid blocking initial render
    // Only connect if Redix is enabled
    if (import.meta.env.VITE_DISABLE_REDIX !== 'true' && import.meta.env.DISABLE_REDIX !== 'true') {
      // Use requestIdleCallback or setTimeout to defer connection
      if ('requestIdleCallback' in window) {
        requestIdleCallback(
          () => {
            this.connect();
          },
          { timeout: 2000 }
        );
      } else {
        setTimeout(() => {
          this.connect();
        }, 1000);
      }
    }
  }

  connect(): void {
    if (this.isConnecting) return;

    // Check if Redix is disabled via environment variable
    if (import.meta.env.VITE_DISABLE_REDIX === 'true' || import.meta.env.DISABLE_REDIX === 'true') {
      return; // Don't attempt connection if Redix is disabled
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.backoff = 1000;
        this.isConnecting = false;
        this.errorLogged = false; // Reset error flag on successful connection
        if (import.meta.env.DEV) {
          console.log('[RedixWS] Connected to', this.url);
        }
      };

      this.ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const message: RedixMessage = JSON.parse(event.data);
          if (message?.id && this.listeners.has(message.id)) {
            const listener = this.listeners.get(message.id);
            listener?.(message);
          }
          window.dispatchEvent(new CustomEvent('redix:message', { detail: message }));
        } catch (error) {
          // Silently handle parse errors - don't spam console
          if (import.meta.env.DEV) {
            console.warn('[RedixWS] failed to parse message', error);
          }
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        // Only retry if not explicitly disabled
        if (
          import.meta.env.VITE_DISABLE_REDIX !== 'true' &&
          import.meta.env.DISABLE_REDIX !== 'true'
        ) {
          window.setTimeout(() => this.connect(), this.backoff);
          this.backoff = Math.min(this.backoff * 1.5, 30_000);
        }
      };

      this.ws.onerror = event => {
        this.isConnecting = false;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.close();
        }
        // Suppress all WebSocket errors - Redix is optional
        // The browser will still log the error, but we prevent it from being shown
        event.stopPropagation();
        // Only log error once to avoid console spam, and only in dev mode
        if (!this.errorLogged && import.meta.env.DEV) {
          this.errorLogged = true;
          // Use console.debug instead of console.warn to reduce noise
          console.debug(
            '[RedixWS] WebSocket connection unavailable - Redix server may not be running. This is expected if Redix is not configured.'
          );
        }
      };
    } catch (_error) {
      this.isConnecting = false;
      // Suppress connection errors - Redix is optional
      if (!this.errorLogged && import.meta.env.DEV) {
        this.errorLogged = true;
        console.debug(
          '[RedixWS] WebSocket connection unavailable - Redix is optional and will gracefully degrade.'
        );
      }
    }
  }

  send(message: RedixMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      const payload = message.payload ?? {};
      fetch(DEFAULT_HTTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: (payload as Record<string, unknown>).query,
          sessionId: (payload as Record<string, unknown>).sessionId,
          options: (payload as Record<string, unknown>).options,
        }),
      })
        .then(async res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const data = await res.json();
          if (message.id && this.listeners.has(message.id)) {
            const listener = this.listeners.get(message.id);
            listener?.({
              id: message.id,
              type: 'final_result',
              payload: data,
            });
            this.listeners.delete(message.id);
          }
        })
        .catch(error => {
          if (message.id && this.listeners.has(message.id)) {
            const listener = this.listeners.get(message.id);
            listener?.({
              id: message.id,
              type: 'error',
              payload: { message: error.message },
            });
            this.listeners.delete(message.id);
          }
        });
    }
  }

  private startHttpStream(
    id: string,
    query: string,
    sessionId: string,
    options: RequestOptions,
    onMessage: Listener
  ): { id: string; cancel: () => void } {
    const url = new URL(DEFAULT_SSE_URL, window.location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('sessionId', sessionId);

    const safeParse = (data: string | null) => {
      if (!data) return {};
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    };

    const eventSource = new EventSource(url.toString());

    const handleAck = (event: MessageEvent<string>) => {
      onMessage({ id, type: 'ack', payload: safeParse(event.data) });
    };
    const handleUpdate = (event: MessageEvent<string>) => {
      onMessage({ id, type: 'partial_result', payload: safeParse(event.data) });
    };
    const handleToken = (event: MessageEvent<string>) => {
      const data = safeParse(event.data);
      const item = (data as Record<string, unknown>).item;
      const items = item ? [item] : [];
      onMessage({ id, type: 'partial_result', payload: { items } });
    };
    const handleResult = (event: MessageEvent<string>) => {
      onMessage({ id, type: 'final_result', payload: safeParse(event.data) });
      cleanup();
    };
    const handleError = (event: MessageEvent<string>) => {
      onMessage({ id, type: 'error', payload: safeParse(event.data) });
      cleanup();
    };
    const handleDone = () => {
      cleanup();
    };

    const cleanup = () => {
      eventSource.removeEventListener('ack', handleAck as EventListener);
      eventSource.removeEventListener('update', handleUpdate as EventListener);
      eventSource.removeEventListener('token', handleToken as EventListener);
      eventSource.removeEventListener('result', handleResult as EventListener);
      eventSource.removeEventListener('error', handleError as EventListener);
      eventSource.removeEventListener('done', handleDone as EventListener);
      eventSource.close();
    };

    eventSource.addEventListener('ack', handleAck as EventListener);
    eventSource.addEventListener('update', handleUpdate as EventListener);
    eventSource.addEventListener('token', handleToken as EventListener);
    eventSource.addEventListener('result', handleResult as EventListener);
    eventSource.addEventListener('error', handleError as EventListener);
    eventSource.addEventListener('done', handleDone as EventListener);

    eventSource.onerror = () => {
      onMessage({ id, type: 'error', payload: { message: 'sse-disconnected' } });
      cleanup();
    };

    return {
      id,
      cancel: () => {
        cleanup();
      },
    };
  }

  request(
    query: string,
    sessionId: string,
    options: RequestOptions = {},
    onMessage: Listener
  ): { id: string; cancel: () => void } {
    const id = crypto.randomUUID();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return this.startHttpStream(id, query, sessionId, options, onMessage);
    }

    this.listeners.set(id, onMessage);
    this.send({
      id,
      type: 'start_query',
      payload: { query, sessionId, options: { stream: true, ...options } },
    });
    return {
      id,
      cancel: () => {
        this.listeners.delete(id);
        this.send({ id, type: 'cancel', payload: { taskId: options.taskId } });
      },
    };
  }
}

// Only create WebSocket connection if Redix is enabled
// This prevents connection errors when Redix server is not running
let _redixWSInstance: RedixWS | null = null;

// Lazy initialization - only connect when actually needed
export const getRedixWS = (): RedixWS => {
  if (!_redixWSInstance) {
    // Check if Redix is disabled
    if (import.meta.env.VITE_DISABLE_REDIX === 'true' || import.meta.env.DISABLE_REDIX === 'true') {
      // Create a stub that falls back to HTTP
      _redixWSInstance = new RedixWS();
      // Don't attempt connection
      (_redixWSInstance as any).ws = null;
      (_redixWSInstance as any).connect = () => {}; // No-op
    } else {
      _redixWSInstance = new RedixWS();
    }
  }
  return _redixWSInstance;
};

// Export singleton for backward compatibility
export const redixWS = getRedixWS();
