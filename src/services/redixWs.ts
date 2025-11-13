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

  constructor(url: string = DEFAULT_WS_URL) {
    this.url = url;
    this.connect();
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.backoff = 1000;
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
        console.warn('[RedixWS] failed to parse message', error);
      }
    };

    this.ws.onclose = () => {
      window.setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 1.5, 30_000);
    };

    this.ws.onerror = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    };
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
        .then(async (res) => {
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
        .catch((error) => {
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
    onMessage: Listener,
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
    onMessage: Listener,
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

export const redixWS = new RedixWS();

