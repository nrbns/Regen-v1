/**
 * Cursor AI IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getCursorAdapter } from './cursor-adapter';
import { contextBuilder } from './context-builder';

// Schemas
const CursorSetApiKeyRequest = z.object({
  apiKey: z.string().min(1),
});

const _CursorSetApiKeyResponse = z.object({
  success: z.boolean(),
});

const CursorCheckApiKeyRequest = z.object({});
const _CursorCheckApiKeyResponse = z.object({
  hasKey: z.boolean(),
  isAvailable: z.boolean(),
});

const CursorQueryRequest = z.object({
  question: z.string().min(1),
  pageSnapshot: z
    .object({
      url: z.string(),
      title: z.string(),
      html: z.string().optional(),
      text: z.string().optional(),
    })
    .optional(),
  editorState: z
    .object({
      filePath: z.string(),
      content: z.string(),
      language: z.string().optional(),
      cursorLine: z.number().optional(),
      cursorCol: z.number().optional(),
    })
    .optional(),
  useWebSocket: z.boolean().optional().default(false),
  systemInstructions: z.string().optional(),
});

const _CursorQueryResponse = z.object({
  jobId: z.string(),
  answer: z.string().optional(),
  status: z.enum(['streaming', 'complete', 'error']),
  error: z.string().optional(),
});

const _CursorStreamChunk = z.object({
  type: z.enum(['token', 'patch', 'citation', 'done', 'error']),
  data: z.union([z.string(), z.record(z.unknown())]),
  sequenceId: z.number().optional(),
});

export function registerCursorIpc(): void {
  /**
   * Set Cursor API key
   */
  registerHandler('cursor:setApiKey', CursorSetApiKeyRequest, async (_event, request) => {
    try {
      const adapter = getCursorAdapter();
      await adapter.setApiKey(request.apiKey);
      return { success: true } satisfies z.infer<typeof _CursorSetApiKeyResponse>;
    } catch (error) {
      console.error('[Cursor IPC] Failed to set API key', error);
      throw new Error('Failed to store API key');
    }
  });

  /**
   * Check if API key is configured
   */
  registerHandler('cursor:checkApiKey', CursorCheckApiKeyRequest, async () => {
    const adapter = getCursorAdapter();
    const hasKey = await adapter.hasApiKey();
    return {
      hasKey,
      isAvailable: true, // safeStorage availability
    } satisfies z.infer<typeof _CursorCheckApiKeyResponse>;
  });

  /**
   * Query Cursor with context
   */
  registerHandler('cursor:query', CursorQueryRequest, async (event, request) => {
    const adapter = getCursorAdapter();
    await adapter.initialize();

    if (!(await adapter.hasApiKey())) {
      throw new Error('Cursor API key not configured');
    }

    const jobId = `cursor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Build context
    const context = await contextBuilder.buildCombined(
      request.pageSnapshot
        ? {
            url: request.pageSnapshot.url,
            title: request.pageSnapshot.title,
            html: request.pageSnapshot.html,
            text: request.pageSnapshot.text,
          }
        : undefined,
      request.editorState
        ? {
            filePath: request.editorState.filePath,
            content: request.editorState.content,
            language: request.editorState.language,
            cursorLine: request.editorState.cursorLine,
            cursorCol: request.editorState.cursorCol,
          }
        : undefined,
      {
        systemInstructions: request.systemInstructions,
      }
    );

    // Add user question to conversation
    contextBuilder.addMessage({
      role: 'user',
      content: request.question,
      timestamp: Date.now(),
    });

    // Handle streaming
    if (request.useWebSocket) {
      // WebSocket streaming
      let answer = '';
      let sequenceId = 0;

      adapter
        .connectWebSocket(context, {
          onMessage: chunk => {
            sequenceId = chunk.sequenceId || sequenceId + 1;
            if (chunk.type === 'token') {
              answer += chunk.data as string;
            }

            // Send chunk to renderer
            event.sender.send('cursor:stream', {
              jobId,
              chunk: {
                type: chunk.type,
                data: chunk.data,
                sequenceId,
              },
            });
          },
          onError: error => {
            event.sender.send('cursor:stream', {
              jobId,
              chunk: {
                type: 'error',
                data: error.message,
                sequenceId: sequenceId + 1,
              },
            });
          },
          onClose: () => {
            // Add assistant response to conversation
            if (answer) {
              contextBuilder.addMessage({
                role: 'assistant',
                content: answer,
                timestamp: Date.now(),
              });
            }
          },
        })
        .catch(error => {
          console.error('[Cursor IPC] WebSocket connection failed', error);
          event.sender.send('cursor:stream', {
            jobId,
            chunk: {
              type: 'error',
              data: error.message,
            },
          });
        });
    } else {
      // SSE streaming
      let _answer = ''; // Accumulated answer (currently unused, kept for potential future use)
      let sequenceId = 0;

      adapter
        .callSSE(context, {
          onChunk: chunk => {
            sequenceId = chunk.sequenceId || sequenceId + 1;
            if (chunk.type === 'token') {
              _answer += chunk.data as string;
            }

            // Send chunk to renderer
            event.sender.send('cursor:stream', {
              jobId,
              chunk: {
                type: chunk.type,
                data: chunk.data,
                sequenceId,
              },
            });
          },
          onError: error => {
            event.sender.send('cursor:stream', {
              jobId,
              chunk: {
                type: 'error',
                data: error.message,
                sequenceId: sequenceId + 1,
              },
            });
          },
        })
        .then(result => {
          // Add assistant response to conversation
          if (result.answer) {
            contextBuilder.addMessage({
              role: 'assistant',
              content: result.answer,
              timestamp: Date.now(),
            });
          }

          event.sender.send('cursor:stream', {
            jobId,
            chunk: {
              type: 'done',
              data: '',
              sequenceId: sequenceId + 1,
            },
          });
        })
        .catch(error => {
          console.error('[Cursor IPC] SSE call failed', error);
          event.sender.send('cursor:stream', {
            jobId,
            chunk: {
              type: 'error',
              data: error.message,
            },
          });
        });
    }

    return {
      jobId,
      status: 'streaming' as const,
    } satisfies z.infer<typeof _CursorQueryResponse>;
  });

  /**
   * Clear conversation history
   */
  registerHandler('cursor:clearHistory', z.object({}), async () => {
    contextBuilder.clearHistory();
    return { success: true };
  });
}
