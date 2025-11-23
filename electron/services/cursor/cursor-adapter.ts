/**
 * Cursor AI Adapter
 * Handles REST API, WebSocket, and streaming connections to Cursor
 */

import { keychain } from './keychain';

export interface CursorConfig {
  apiKey?: string;
  baseUrl?: string;
  wsUrl?: string;
  tenantId?: string;
}

export interface CursorContext {
  cursor?: { line: number; col: number };
  files?: Array<{ path: string; text: string; language?: string }>;
  page?: { url: string; title: string; textSnippet: string; html?: string };
  conversation?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  systemInstructions?: string;
}

export interface CursorResponse {
  answer: string;
  citations?: Array<{ file?: string; url?: string; span: [number, number] }>;
  patches?: Array<{ file: string; start: number; end: number; newText: string }>;
  model?: string;
  tokensUsed?: number;
}

export interface CursorStreamChunk {
  type: 'token' | 'patch' | 'citation' | 'done' | 'error';
  data: string | object;
  sequenceId?: number;
}

class CursorAdapter {
  private config: CursorConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastSequenceId: number | null = null;
  private messageHandlers: Map<string, (chunk: CursorStreamChunk) => void> = new Map();

  constructor(config: CursorConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.CURSOR_API_URL || 'https://api.cursor.sh',
      wsUrl: config.wsUrl || process.env.CURSOR_WS_URL || 'wss://api.cursor.sh/ws',
      ...config,
    };
  }

  /**
   * Initialize adapter with API key from keychain
   */
  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      const stored = await keychain.retrieve('cursor-api-key');
      if (stored) {
        this.config.apiKey = stored;
      }
    }
  }

  /**
   * Set API key and store in keychain
   */
  async setApiKey(key: string): Promise<void> {
    this.config.apiKey = key;
    await keychain.store('cursor-api-key', key);
  }

  /**
   * Check if API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    if (this.config.apiKey) return true;
    return await keychain.has('cursor-api-key');
  }

  /**
   * Call Cursor REST API with SSE streaming
   */
  async callSSE(
    context: CursorContext,
    options: {
      onChunk?: (chunk: CursorStreamChunk) => void;
      onError?: (error: Error) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<CursorResponse> {
    await this.initialize();

    if (!this.config.apiKey) {
      throw new Error('Cursor API key not configured');
    }

    const url = `${this.config.baseUrl}/v1/assist`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        context: this.buildContext(context),
        tenantId: this.config.tenantId,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 401) {
        throw new Error('Cursor authentication failed - please re-authenticate');
      } else if (response.status === 429) {
        throw new Error('Cursor rate limit reached - please retry later');
      } else if (response.status === 503) {
        throw new Error('Cursor temporarily unavailable - please try again');
      }
      throw new Error(`Cursor API error: ${response.status} ${errorText}`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let sequenceId = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              options.onChunk?.({ type: 'done', data: '', sequenceId });
              return { answer, tokensUsed: sequenceId };
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'token') {
                answer += parsed.content;
                sequenceId = parsed.sequenceId || sequenceId + 1;
                options.onChunk?.({
                  type: 'token',
                  data: parsed.content,
                  sequenceId,
                });
              } else if (parsed.type === 'patch') {
                options.onChunk?.({
                  type: 'patch',
                  data: parsed,
                  sequenceId: parsed.sequenceId,
                });
              } else if (parsed.type === 'citation') {
                options.onChunk?.({
                  type: 'citation',
                  data: parsed,
                  sequenceId: parsed.sequenceId,
                });
              }
            } catch {
              // Invalid JSON, skip
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      options.onError?.(error as Error);
      throw error;
    }

    return { answer, tokensUsed: sequenceId };
  }

  /**
   * Connect to Cursor WebSocket
   */
  async connectWebSocket(
    context: CursorContext,
    options: {
      onMessage?: (chunk: CursorStreamChunk) => void;
      onError?: (error: Error) => void;
      onClose?: () => void;
      resumeFrom?: number;
    } = {}
  ): Promise<void> {
    await this.initialize();

    if (!this.config.apiKey) {
      throw new Error('Cursor API key not configured');
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.wsUrl}?token=${encodeURIComponent(this.config.apiKey || '')}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.lastSequenceId = options.resumeFrom || null;

          // Send auth message
          this.ws?.send(
            JSON.stringify({
              type: 'auth',
              token: this.config.apiKey,
              resumeFrom: this.lastSequenceId,
            })
          );

          // Send context
          this.ws?.send(
            JSON.stringify({
              type: 'context',
              data: this.buildContext(context),
            })
          );

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        };

        this.ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data as string);
            if (message.type === 'pong') {
              return; // Heartbeat response
            }

            if (message.sequenceId) {
              this.lastSequenceId = message.sequenceId;
            }

            const chunk: CursorStreamChunk = {
              type: message.type || 'token',
              data: message.data || message.content || '',
              sequenceId: message.sequenceId,
            };

            options.onMessage?.(chunk);
          } catch (error) {
            console.error('[Cursor] Failed to parse WebSocket message', error);
          }
        };

        this.ws.onerror = error => {
          console.error('[Cursor] WebSocket error', error);
          options.onError?.(new Error('WebSocket connection error'));
        };

        this.ws.onclose = event => {
          this.stopHeartbeat();
          options.onClose?.();

          // Attempt reconnect if not intentional
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect(context, options);
          } else {
            reject(new Error('WebSocket connection closed'));
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message over WebSocket
   */
  sendMessage(message: { type: string; data?: unknown }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
  }

  /**
   * Build structured context from input
   */
  private buildContext(context: CursorContext): unknown {
    return {
      cursor: context.cursor,
      files: context.files,
      page: context.page
        ? {
            url: context.page.url,
            title: context.page.title,
            textSnippet: context.page.textSnippet,
            // Don't send full HTML for security
            html: context.page.html ? this.sanitizeHTML(context.page.html) : undefined,
          }
        : undefined,
      conversation: context.conversation?.slice(-10), // Last 10 messages
      systemInstructions: context.systemInstructions,
    };
  }

  /**
   * Sanitize HTML to remove scripts and dangerous content
   */
  private sanitizeHTML(html: string): string {
    // Remove script tags
    let sanitized = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    // Remove event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    return sanitized;
  }

  /**
   * Start heartbeat ping
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000); // Every 15 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(
    context: CursorContext,
    options: {
      onMessage?: (chunk: CursorStreamChunk) => void;
      onError?: (error: Error) => void;
      onClose?: () => void;
    }
  ): void {
    this.reconnectAttempts++;
    const wait = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    const jitter = Math.random() * 1000;

    this.reconnectTimer = setTimeout(() => {
      console.log(`[Cursor] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connectWebSocket(context, {
        ...options,
        resumeFrom: this.lastSequenceId || undefined,
      }).catch(error => {
        console.error('[Cursor] Reconnection failed', error);
        options.onError?.(error);
      });
    }, wait + jitter);
  }
}

// Singleton instance
let cursorAdapterInstance: CursorAdapter | null = null;

export function getCursorAdapter(config?: CursorConfig): CursorAdapter {
  if (!cursorAdapterInstance) {
    cursorAdapterInstance = new CursorAdapter(config);
  }
  return cursorAdapterInstance;
}
