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

/**
 * LLM Worker
 * Processes LLM jobs asynchronously and streams results via WebSocket
 */
const worker = new Worker(
  'llmQueue',
  async job => {
    const { query, context, tabId: _tabId, sessionId, model, stream, clientId } = job.data;

    if (!query) {
      throw new Error('query-required');
    }

    // Send start event
    if (clientId) {
      sendToClient({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        clientId,
        sessionId,
        type: 'agent.start',
        jobId: job.id,
        query,
        timestamp: Date.now(),
      });
    }

    const jobStartTime = Date.now();

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
                fullResponse += token;
                chunkIndex++;

                // Send chunk via WebSocket immediately
                if (clientId) {
                  sendToClient({
                    id: `chunk-${job.id}-${chunkIndex}`,
                    clientId,
                    sessionId,
                    type: 'agent.chunk',
                    jobId: job.id,
                    content: token,
                    index: chunkIndex,
                    timestamp: Date.now(),
                  });
                }

                // PR 4: Publish to Redis for Socket.IO forwarding
                try {
                  const { publishModelChunk } = await import('../../pubsub/redis-pubsub.js');
                  const userId = job.data.userId || clientId;
                  await publishModelChunk(job.id, userId, token, chunkIndex, null);
                } catch {
                  // Silently fail if Redis unavailable
                }
              },
            }
          );
        } else {
          // Use OpenAI streaming
          const result = await llmService.callOpenAIStream(
            messages,
            { model, temperature: 0.2 },
            {
              onToken: async token => {
                fullResponse += token;
                chunkIndex++;

                // Send chunk via WebSocket immediately
                if (clientId) {
                  sendToClient({
                    id: `chunk-${job.id}-${chunkIndex}`,
                    clientId,
                    sessionId,
                    type: 'agent.chunk',
                    jobId: job.id,
                    content: token,
                    index: chunkIndex,
                    timestamp: Date.now(),
                  });
                }

                // PR 4: Publish to Redis for Socket.IO forwarding
                try {
                  const { publishModelChunk } = await import('../../pubsub/redis-pubsub.js');
                  const userId = job.data.userId || clientId;
                  await publishModelChunk(job.id, userId, token, chunkIndex, null);
                } catch {
                  // Silently fail if Redis unavailable
                }
              },
            }
          );
          finalModel = result.model;
          tokensUsed = result.tokensStreamed;
        }

        // Send completion
        if (clientId) {
          sendToClient({
            id: `done-${job.id}`,
            clientId,
            sessionId,
            type: 'agent.done',
            jobId: job.id,
            result: {
              answer: fullResponse,
              model: finalModel,
              tokensUsed: tokensUsed || chunkIndex,
            },
            timestamp: Date.now(),
          });
        }

        // Publish completion to Redis for Socket.IO forwarding
        try {
          const { publishModelComplete } = await import('../../pubsub/redis-pubsub.js');
          const userId = job.data.userId || clientId || 'anonymous';
          const duration = Date.now() - jobStartTime;
          await publishModelComplete(
            job.id,
            userId,
            fullResponse,
            tokensUsed || chunkIndex,
            duration
          );
        } catch (error) {
          console.warn('[LLMWorker] Failed to publish completion to Redis:', error.message);
        }

        return {
          answer: fullResponse,
          model: finalModel,
          tokensUsed: tokensUsed || chunkIndex,
          chunks: chunkIndex,
        };
      } else {
        // Non-streaming
        const response = await llmService.analyzeContent(query, {
          context,
          model,
          temperature: 0.2,
        });

        // Send result
        if (clientId) {
          sendToClient({
            id: `result-${job.id}`,
            clientId,
            sessionId,
            type: 'agent.done',
            jobId: job.id,
            result: {
              answer: response.answer,
              model: response.model,
              tokensUsed: response.tokensUsed,
            },
            timestamp: Date.now(),
          });
        }

        return {
          answer: response.answer,
          model: response.model,
          tokensUsed: response.tokensUsed,
        };
      }
    } catch (error) {
      // Send error
      if (clientId) {
        sendToClient({
          id: `error-${job.id}`,
          clientId,
          sessionId,
          type: 'agent.error',
          jobId: job.id,
          error: error.message,
          timestamp: Date.now(),
        });
      }
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 LLM jobs concurrently
  }
);

worker.on('completed', job => {
  console.info('[LLM Worker] completed', job.id);
});

worker.on('failed', (job, err) => {
  console.error('[LLM Worker] failed', job?.id, err);
});

worker.on('error', err => {
  // Completely suppress all Redis connection errors
  if (err && typeof err === 'object') {
    const code = err.code;
    const message = err?.message || '';
    const name = err?.name || '';
    const stack = err?.stack || '';

    // Check all possible Redis error indicators
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'MaxRetriesPerRequestError' ||
      message.includes('Connection is closed') ||
      message.includes('ECONNREFUSED') ||
      message.includes('127.0.0.1:6379') ||
      message.includes('Connection is closed') ||
      name === 'ConnectionClosedError' ||
      stack.includes('connectionCloseHandler') ||
      stack.includes('ioredis')
    ) {
      // Silently ignore - Redis is optional
      return;
    }
  }
  // Only log non-Redis errors
  console.error('[LLM Worker] error', err);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

console.log('[LLM Worker] Started');
