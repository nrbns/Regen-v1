#!/usr/bin/env node
/* eslint-env node */
// Load environment variables first
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

import { createRequire } from 'node:module';
import { getBullConnection } from '../../config/redis.js';
import { sendToClient } from '../realtime/websocket-server.js';

const { Worker } = createRequire(import.meta.url)('bullmq');
const connection = getBullConnection();

// PR C: Import job persistence
let jobPersistence;
try {
  jobPersistence = await import('../../jobs/persistence.js');
} catch {
  jobPersistence = null;
}

// PR C: Checkpoint interval (every N chunks)
const CHECKPOINT_INTERVAL = 10;

/**
 * LLM Worker
 * Processes LLM jobs asynchronously and streams results via WebSocket
 * PR C: Enhanced with Redis pub/sub and job persistence
 */
const worker = new Worker(
  'llmQueue',
  async job => {
    const { query, context, tabId: _tabId, sessionId, model, stream, clientId, userId } = job.data;

    if (!query) {
      throw new Error('query-required');
    }

    const jobId = job.id;
    const searchStartTime = Date.now();

    // PR C: Initialize job state
    if (jobPersistence && userId) {
      await jobPersistence.updateJobProgress(jobId, userId, 0, 'processing', 0);
    }

    // Send start event
    if (clientId) {
      sendToClient({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        clientId,
        sessionId,
        type: 'agent.start',
        jobId,
        query,
        timestamp: Date.now(),
      });
    }

    // PR 14: Handle cancellation
    let cancelled = false;
    job.on('progress', progress => {
      if (progress === 'cancelled') {
        cancelled = true;
      }
    });

    try {
      // Call LLM (Ollama or OpenAI) with streaming
      const llmService = await import('../agent/llm.js');

      // For streaming, use real streaming implementation
      if (stream) {
        let fullResponse = '';
        let chunkIndex = 0;
        let finalModel = model;
        let tokensUsed = 0;

        // Build messages for LLM
        const messages = [
          { role: 'system', content: context || 'You are a helpful assistant.' },
          { role: 'user', content: query },
        ];

        // Use real streaming based on provider
        const provider =
          process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'ollama');

        if (provider === 'ollama' || !process.env.OPENAI_API_KEY) {
          // Use Ollama streaming
          await llmService.callOllamaStream(
            messages,
            { model, temperature: 0.2 },
            {
              onToken: async token => {
                // PR 14: Check for cancellation
                if (cancelled) {
                  throw new Error('Job cancelled by user');
                }

                fullResponse += token;
                chunkIndex++;

                // Send chunk via WebSocket immediately
                if (clientId) {
                  sendToClient({
                    id: `chunk-${jobId}-${chunkIndex}`,
                    clientId,
                    sessionId,
                    type: 'agent.chunk',
                    jobId,
                    content: token,
                    index: chunkIndex,
                    timestamp: Date.now(),
                  });
                }

                // PR C: Publish to Redis for Socket.IO forwarding
                try {
                  const { publishModelChunk } = await import('../../pubsub/redis-pubsub.js');
                  const userIdForPub = userId || clientId;
                  await publishModelChunk(jobId, userIdForPub, token, chunkIndex, null);
                } catch {
                  // Silently fail if Redis unavailable
                }

                // PR C: Checkpoint every N chunks
                if (jobPersistence && userId && chunkIndex % CHECKPOINT_INTERVAL === 0) {
                  await jobPersistence.updateJobProgress(
                    jobId,
                    userId,
                    Math.min(90, (chunkIndex / 100) * 100),
                    'processing',
                    chunkIndex
                  );
                }
              },
              onComplete: async (response, modelUsed) => {
                finalModel = modelUsed || model;
                tokensUsed = response.usage?.total_tokens || 0;
              },
            }
          );
        } else {
          // Use OpenAI streaming
          await llmService.callOpenAIStream(
            messages,
            { model, temperature: 0.2 },
            {
              onToken: async token => {
                // PR 14: Check for cancellation
                if (cancelled) {
                  throw new Error('Job cancelled by user');
                }

                fullResponse += token;
                chunkIndex++;

                // Send chunk via WebSocket immediately
                if (clientId) {
                  sendToClient({
                    id: `chunk-${jobId}-${chunkIndex}`,
                    clientId,
                    sessionId,
                    type: 'agent.chunk',
                    jobId,
                    content: token,
                    index: chunkIndex,
                    timestamp: Date.now(),
                  });
                }

                // PR C: Publish to Redis for Socket.IO forwarding
                try {
                  const { publishModelChunk } = await import('../../pubsub/redis-pubsub.js');
                  const userIdForPub = userId || clientId;
                  await publishModelChunk(jobId, userIdForPub, token, chunkIndex, null);
                } catch {
                  // Silently fail if Redis unavailable
                }

                // PR C: Checkpoint every N chunks
                if (jobPersistence && userId && chunkIndex % CHECKPOINT_INTERVAL === 0) {
                  await jobPersistence.updateJobProgress(
                    jobId,
                    userId,
                    Math.min(90, (chunkIndex / 100) * 100),
                    'processing',
                    chunkIndex
                  );
                }
              },
              onComplete: async (response, modelUsed) => {
                finalModel = modelUsed || model;
                tokensUsed = response.usage?.total_tokens || 0;
              },
            }
          );
        }

        // PR 14: Check for cancellation before completion
        if (cancelled) {
          if (jobPersistence && userId) {
            await jobPersistence.markJobFailed(jobId, userId, new Error('Cancelled by user'));
          }
          throw new Error('Job cancelled by user');
        }

        // PR C: Publish completion to Redis
        try {
          const { publishModelComplete } = await import('../../pubsub/redis-pubsub.js');
          const userIdForPub = userId || clientId;
          await publishModelComplete(
            jobId,
            userIdForPub,
            fullResponse,
            tokensUsed,
            Date.now() - searchStartTime
          );
        } catch (error) {
          console.warn('[LLMWorker] Failed to publish completion to Redis:', error.message);
        }

        // PR C: Mark job as complete
        if (jobPersistence && userId) {
          await jobPersistence.markJobComplete(jobId, userId, {
            text: fullResponse,
            provider: provider,
            model: finalModel,
            tokensUsed,
          });
        }

        // Send completion event
        if (clientId) {
          sendToClient({
            id: `complete-${jobId}`,
            clientId,
            sessionId,
            type: 'agent.complete',
            jobId,
            result: {
              text: fullResponse,
              provider: provider,
              model: finalModel,
              tokensUsed,
            },
            timestamp: Date.now(),
          });
        }

        return {
          success: true,
          text: fullResponse,
          provider: provider,
          model: finalModel,
          tokensUsed,
          duration: Date.now() - searchStartTime,
        };
      } else {
        // Non-streaming path (simplified)
        const result = await llmService.callLLM(messages, { model, temperature: 0.2 });

        // PR C: Mark job as complete
        if (jobPersistence && userId) {
          await jobPersistence.markJobComplete(jobId, userId, result);
        }

        return {
          success: true,
          ...result,
          duration: Date.now() - searchStartTime,
        };
      }
    } catch (error) {
      // PR C: Mark job as failed
      if (jobPersistence && userId) {
        await jobPersistence.markJobFailed(jobId, userId, error);
      }

      // PR 14: Handle cancellation gracefully
      if (cancelled || error.message?.includes('cancelled')) {
        if (clientId) {
          sendToClient({
            id: `cancel-${jobId}`,
            clientId,
            sessionId,
            type: 'agent.cancelled',
            jobId,
            timestamp: Date.now(),
          });
        }
        throw new Error('Job cancelled by user');
      }

      // Send error event
      if (clientId) {
        sendToClient({
          id: `error-${jobId}`,
          clientId,
          sessionId,
          type: 'agent.error',
          jobId,
          error: error.message,
          timestamp: Date.now(),
        });
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // PR 5: Limit concurrency
    limiter: {
      max: 10, // PR 5: Rate limit
      duration: 1000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
    attempts: 3, // PR 5: Retry failed jobs
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }
);

// PR 14: Handle job cancellation
worker.on('completed', job => {
  console.log(`[LLMWorker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[LLMWorker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', err => {
  console.error('[LLMWorker] Worker error:', err);
});

console.log('[LLMWorker] Worker started and ready to process jobs');
