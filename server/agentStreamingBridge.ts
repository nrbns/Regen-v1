/**
 * Agent Streaming Bridge - Wires LangChain agent callbacks to Socket.IO events
 * 
 * Converts agent StreamCallback events to:
 * - MODEL_CHUNK: Token-by-token output
 * - JOB_PROGRESS: Step changes (thinking/searching/writing)
 * - JOB_COMPLETED: Final result
 * - JOB_FAILED: Errors
 */

import { Server as SocketIOServer } from 'socket.io';
import type { StreamCallback } from './langchain-agents';
import { publishJobEvent } from './realtime';
import type { RedisClientType } from 'redis';

interface StreamBridgeOptions {
  jobId: string;
  userId: string;
  io: SocketIOServer;
  redis?: RedisClientType;
}

/**
 * Create a streaming callback that emits Socket.IO events
 * Maps agent streaming to realtime panel updates
 */
export function createAgentStreamCallback(options: StreamBridgeOptions): StreamCallback {
  const { jobId, userId, io, redis } = options;
  let sequence = 0;
  let currentStep = 'idle';

  return async (chunk) => {
    sequence++;

    try {
      switch (chunk.type) {
        case 'token':
          // Emit MODEL_CHUNK event for token-by-token output
          if (chunk.content) {
            const event = {
              event: 'model:chunk' as const,
              userId,
              jobId,
              payload: {
                chunk: chunk.content,
                sequence,
              },
              sequence,
              timestamp: Date.now(),
            };

            // Emit via Socket.IO
            io.to(`job:${jobId}`).emit('model:chunk', event.payload);
            io.to(`user:${userId}`).emit('model:chunk', event.payload);

            // Publish to Redis for other servers
            if (redis) {
              await publishJobEvent(redis, event);
            }
          }
          break;

        case 'step':
          // Emit JOB_PROGRESS with step change
          if (chunk.content) {
            currentStep = chunk.content; // thinking, searching, writing
            const event = {
              event: 'job:progress' as const,
              userId,
              jobId,
              payload: {
                step: currentStep,
                stage: chunk.data?.stage || currentStep,
                progress: calculateProgress(chunk.step || 0),
                sequence,
              },
              sequence,
              timestamp: Date.now(),
            };

            io.to(`job:${jobId}`).emit('job:progress', event.payload);
            io.to(`user:${userId}`).emit('job:progress', event.payload);

            if (redis) {
              await publishJobEvent(redis, event);
            }
          }
          break;

        case 'done':
          // Emit JOB_COMPLETED
          const completeEvent = {
            event: 'job:completed' as const,
            userId,
            jobId,
            payload: {
              result: 'Workflow completed',
              metadata: chunk.data || {},
              sequence,
            },
            sequence,
            timestamp: Date.now(),
          };

          io.to(`job:${jobId}`).emit('job:completed', completeEvent.payload);
          io.to(`user:${userId}`).emit('job:completed', completeEvent.payload);

          if (redis) {
            await publishJobEvent(redis, completeEvent);
          }
          break;

        case 'error':
          // Emit JOB_FAILED
          const errorEvent = {
            event: 'job:failed' as const,
            userId,
            jobId,
            payload: {
              error: chunk.content || 'Agent workflow failed',
              sequence,
            },
            sequence,
            timestamp: Date.now(),
          };

          io.to(`job:${jobId}`).emit('job:failed', errorEvent.payload);
          io.to(`user:${userId}`).emit('job:failed', errorEvent.payload);

          if (redis) {
            await publishJobEvent(redis, errorEvent);
          }
          break;
      }
    } catch (error) {
      console.error('[AgentStreamingBridge] Failed to emit event:', error);
    }
  };
}

/**
 * Calculate progress percentage from step number
 * Typical workflow: thinking (0-20%), searching (20-60%), writing (60-100%)
 */
function calculateProgress(step: number): number {
  // Map step number to progress
  const stepMap: Record<number, number> = {
    0: 10,  // thinking
    1: 30,  // searching
    2: 60,  // summarizing/writing
    3: 80,  // ethics/validation
    4: 95,  // finalizing
  };
  return stepMap[step] || Math.min(step * 20, 95);
}

/**
 * Emit job started event
 */
export async function emitJobStarted(
  options: StreamBridgeOptions,
  jobType: string,
  input: any
): Promise<void> {
  const { jobId, userId, io, redis } = options;

  const event = {
    event: 'job:started' as const,
    userId,
    jobId,
    payload: {
      type: jobType,
      input,
      step: 'thinking',
      sequence: 0,
    },
    sequence: 0,
    timestamp: Date.now(),
  };

  io.to(`job:${jobId}`).emit('job:started', event.payload);
  io.to(`user:${userId}`).emit('job:started', event.payload);

  if (redis) {
    await publishJobEvent(redis, event);
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * const streamCallback = createAgentStreamCallback({
 *   jobId: 'job-123',
 *   userId: 'user-456',
 *   io: socketIOServer,
 *   redis: redisClient,
 * });
 * 
 * await emitJobStarted({ jobId, userId, io, redis }, 'research', { query: 'test' });
 * 
 * const result = await agentEngine.runWorkflow({
 *   query: 'What is quantum computing?',
 *   workflowType: 'research',
 * }, streamCallback);
 * ```
 */
