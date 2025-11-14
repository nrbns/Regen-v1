/**
 * Redix IPC Service - Bridge between Electron and FastAPI backend
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { RedixAskRequest } from '../shared/ipc/schema';
import { getActiveTabIdForWindow, findTabById } from './tabs';
import { BrowserWindow } from 'electron';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds

interface RedixAskResponse {
  response?: string;
  tokens?: number;
  cached?: boolean;
  ready?: boolean;
  error?: string;
}

/**
 * Make HTTP request to FastAPI backend
 */
async function httpRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(API_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Request timeout - backend may be unavailable');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Backend connection failed - is the API server running?');
      }
    }
    throw error;
  }
}

/**
 * Stream SSE response from FastAPI backend
 */
async function streamSSE(
  endpoint: string,
  body: unknown,
  onChunk: (data: { type: string; text?: string; tokens?: number; done?: boolean; error?: string }) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      onChunk({ type: 'error', text: errorText, done: true });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onChunk({ type: 'error', text: 'No response body', done: true });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onChunk(data);
            if (data.done) return;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    onChunk({
      type: 'error',
      text: error instanceof Error ? error.message : 'Stream error',
      done: true,
    });
  }
}

export function registerRedixIpc() {
  // Redix /ask endpoint with SSE streaming
  registerHandler('redix:ask', RedixAskRequest, async (event, request) => {
    try {
      // Get tab context for enhanced prompts
      let tabContext: { url?: string; title?: string; pageText?: string } | null = null;
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
          const activeTabId = getActiveTabIdForWindow(win.id);
          if (activeTabId) {
            const tab = findTabById(activeTabId);
            if (tab) {
              const webContents = tab.view.webContents;
              const url = webContents.getURL();
              const title = webContents.getTitle();
              
              // Try to get page text (first 1000 chars) for context
              let pageText = '';
              try {
                const script = `
                  (() => {
                    const body = document.body?.innerText || '';
                    const article = document.querySelector('article')?.innerText || '';
                    return (article || body).slice(0, 1000);
                  })();
                `;
                pageText = await webContents.executeJavaScript(script).catch(() => '');
              } catch {
                // Silent fail
              }
              
              tabContext = { url, title, pageText };
            }
          }
        }
      } catch {
        // Silent fail - continue without context
      }
      
      // Enhance prompt with tab context if available
      let enhancedPrompt = request.prompt;
      if (tabContext && tabContext.url && !tabContext.url.startsWith('about:') && !tabContext.url.startsWith('chrome:')) {
        enhancedPrompt = `${request.prompt}\n\nContext from current tab:\nTitle: ${tabContext.title || 'Untitled'}\nURL: ${tabContext.url}\n${tabContext.pageText ? `Content preview: ${tabContext.pageText.slice(0, 500)}...` : ''}`;
      }
      
      if (request.stream) {
        // For streaming, we need to handle it differently
        // Return a promise that resolves when streaming starts
        // The actual streaming will be handled via events
        return { success: true, streaming: true };
      } else {
        // Non-streaming request
        const response = await httpRequest<RedixAskResponse>('/redix/ask', {
          method: 'POST',
          body: {
            prompt: enhancedPrompt,
            session_id: request.sessionId,
            stream: false,
          },
        });

        return {
          success: true,
          response: response.response || '',
          tokens: response.tokens || 0,
          cached: response.cached || false,
          ready: response.ready !== false,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ready: false,
      };
    }
  });

  // Redix status check
  registerHandler('redix:status', z.object({}), async () => {
    try {
      const response = await httpRequest<{ ready: boolean; backend: string; message: string }>('/redix/status');
      return {
        success: true,
        ready: response.ready,
        backend: response.backend,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        ready: false,
        backend: 'offline',
        message: 'Backend unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Redix stream (for SSE streaming via events)
  registerHandler('redix:stream', RedixAskRequest, async (event, request) => {
    try {
      // Get tab context for enhanced prompts
      let tabContext: { url?: string; title?: string; pageText?: string } | null = null;
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
          const activeTabId = getActiveTabIdForWindow(win.id);
          if (activeTabId) {
            const tab = findTabById(activeTabId);
            if (tab) {
              const webContents = tab.view.webContents;
              const url = webContents.getURL();
              const title = webContents.getTitle();
              
              // Try to get page text (first 1000 chars) for context
              let pageText = '';
              try {
                const script = `
                  (() => {
                    const body = document.body?.innerText || '';
                    const article = document.querySelector('article')?.innerText || '';
                    return (article || body).slice(0, 1000);
                  })();
                `;
                pageText = await webContents.executeJavaScript(script).catch(() => '');
              } catch {
                // Silent fail
              }
              
              tabContext = { url, title, pageText };
            }
          }
        }
      } catch {
        // Silent fail - continue without context
      }
      
      // Enhance prompt with tab context if available
      let enhancedPrompt = request.prompt;
      if (tabContext && tabContext.url && !tabContext.url.startsWith('about:') && !tabContext.url.startsWith('chrome:')) {
        enhancedPrompt = `${request.prompt}\n\nContext from current tab:\nTitle: ${tabContext.title || 'Untitled'}\nURL: ${tabContext.url}\n${tabContext.pageText ? `Content preview: ${tabContext.pageText.slice(0, 500)}...` : ''}`;
      }
      
      // Start streaming in background and emit events
      streamSSE(
        '/redix/ask',
        {
          prompt: enhancedPrompt,
          session_id: request.sessionId,
          stream: true,
        },
        (chunk) => {
          // Emit chunk to renderer via IPC event
          event.sender.send('redix:chunk', chunk);
        }
      ).catch((error) => {
        event.sender.send('redix:chunk', {
          type: 'error',
          text: error instanceof Error ? error.message : 'Stream error',
          done: true,
        });
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stream error',
      };
    }
  });
}

