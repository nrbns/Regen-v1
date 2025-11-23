/**
 * IPC handlers for Streaming AI
 * With throttled queue to prevent crashes from overloaded IPC handlers
 */

import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { createStreamingAdapter } from './streaming-adapter';
import { BrowserWindow } from 'electron';
import { getMainWindow } from '../windows';
import PQueue from 'p-queue';

// Store active streams by ID
const activeStreams = new Map<string, ReturnType<typeof createStreamingAdapter>>();

// Throttled queue to prevent IPC overload (max 3 concurrent streams)
const streamQueue = new PQueue({ concurrency: 3 });

export function registerStreamingIpc() {
  registerHandler(
    'agent:stream:start',
    z.object({
      query: z.string(),
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    }),
    async (event, request) => {
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const adapter = createStreamingAdapter({
        model: request.model || 'llama3.2',
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      activeStreams.set(streamId, adapter);

      // Get window to send events to (try event.sender first, then main window)
      let targetWindow = BrowserWindow.fromWebContents(event.sender);
      if (!targetWindow || targetWindow.isDestroyed()) {
        targetWindow = getMainWindow();
      }

      // Wrap streaming in throttled queue with error handling
      streamQueue
        .add(async () => {
          try {
            for await (const chunk of adapter.stream(request.query)) {
              // Emit chunks via IPC event with backpressure check
              if (targetWindow && !targetWindow.isDestroyed()) {
                try {
                  targetWindow.webContents.send('agent:stream:chunk', {
                    streamId,
                    chunk,
                  });
                } catch (sendError) {
                  console.error('[StreamingIPC] Failed to send chunk:', sendError);
                  // Continue streaming but stop sending if window is destroyed
                  if (targetWindow.isDestroyed()) {
                    break;
                  }
                }
              } else {
                // Window destroyed, stop streaming
                break;
              }

              if (chunk.finished) {
                if (targetWindow && !targetWindow.isDestroyed()) {
                  try {
                    targetWindow.webContents.send('agent:stream:done', { streamId });
                  } catch (sendError) {
                    console.error('[StreamingIPC] Failed to send done:', sendError);
                  }
                }
                break;
              }
            }
          } catch (error) {
            console.error('[StreamingIPC] Stream error:', error);
            if (targetWindow && !targetWindow.isDestroyed()) {
              try {
                targetWindow.webContents.send('agent:stream:error', {
                  streamId,
                  error: error instanceof Error ? error.message : String(error),
                });
              } catch (sendError) {
                console.error('[StreamingIPC] Failed to send error:', sendError);
              }
            }
          } finally {
            activeStreams.delete(streamId);
          }
        })
        .catch(error => {
          // Handle queue errors
          console.error('[StreamingIPC] Queue error:', error);
          activeStreams.delete(streamId);
          if (targetWindow && !targetWindow.isDestroyed()) {
            try {
              targetWindow.webContents.send('agent:stream:error', {
                streamId,
                error: error instanceof Error ? error.message : String(error),
              });
            } catch {
              // Ignore send errors in error handler
            }
          }
        });

      return { streamId };
    }
  );

  registerHandler(
    'agent:stream:stop',
    z.object({
      streamId: z.string(),
    }),
    async (_event, request) => {
      const adapter = activeStreams.get(request.streamId);
      if (adapter) {
        adapter.removeAllListeners();
        activeStreams.delete(request.streamId);
      }
      return { success: true };
    }
  );
}

// Helper: Get adapter for streaming (used by other services)
export function getStreamingAdapter(streamId: string) {
  return activeStreams.get(streamId);
}
