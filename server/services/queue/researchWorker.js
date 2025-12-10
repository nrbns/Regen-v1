#!/usr/bin/env node
/* eslint-env node */
/**
 * Research Worker
 * Processes research jobs asynchronously and streams progress via WebSocket
 */

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
import { publish } from '../../pubsub.js';
import { multiSourceSearch } from '../research/multiSourceSearch.js';
import { extractMultipleContent } from '../research/extractContent.js';
import { callOllamaStream, callOpenAIStream } from '../agent/llm.js';
import { detectLanguage } from '../lang/detect.js';
import { chunkText, upsertChunks, semanticSearch } from '../research/vectorStore.js';
import {
  buildReasoningPrompt,
  extractCitations,
  extractReasoningSteps,
  extractSourcesList,
  calculateCitationCoverage,
  estimateHallucinationRisk,
  extractEvidenceForClaim,
} from '../research/reasoningChain.js';
import crypto from 'node:crypto';

const { Worker } = createRequire(import.meta.url)('bullmq');
const connection = getBullConnection();

/**
 * Publish research event to WebSocket clients
 * Uses both direct WebSocket and Redis pub/sub for reliability
 * PR 4: Enhanced with Socket.IO compatible events
 */
async function publishEvent(jobId, clientId, sessionId, type, data) {
  const messageId = `${jobId}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;

  const event = {
    id: messageId,
    jobId,
    type: 'research.event',
    eventType: type,
    data,
    timestamp: Date.now(),
  };

  console.log(`[ResearchWorker] Publishing event: ${type} for jobId: ${jobId}`);

  // PR 4: Publish to Redis pub/sub for Socket.IO forwarding
  try {
    const { publishEvent: publishRedisEvent } = await import('../../pubsub/redis-pubsub.js');
    const userId = data.userId || clientId;
    const channel = `job:${jobId}`;

    // Map research events to Socket.IO events
    const socketEventMap = {
      'research:chunk': 'research:chunk:v1',
      'research:source': 'research:source:v1',
      'research:complete': 'research:complete:v1',
      'research:progress': 'task:progress:v1',
    };

    const socketEvent = socketEventMap[type] || type;
    await publishRedisEvent(channel, socketEvent, {
      userId,
      jobId,
      ...data,
    });
  } catch {
    // Silently fail if Redis unavailable
  }

  // Publish to Redis pub/sub (for jobId-based subscription) - legacy
  publish('research.event', event)
    .then(() => {
      console.log(`[ResearchWorker] ✓ Published to Redis: ${type} for jobId: ${jobId}`);
    })
    .catch(err => {
      // Only log if it's not a connection error
      if (err.code !== 'ECONNREFUSED' && !err.message?.includes('Connection is closed')) {
        console.warn(`[ResearchWorker] Failed to publish to Redis: ${err.message}`);
      }
    });

  // Also send directly to client if clientId is available
  if (clientId) {
    const sent = sendToClient({
      ...event,
      clientId,
      sessionId,
    });
    if (sent) {
      console.log(`[ResearchWorker] ✓ Sent directly to client: ${type} for clientId: ${clientId}`);
    }
  }
}

/**
 * Research Worker
 */
const worker = new Worker(
  'researchQueue',
  async job => {
    const { query, lang, options = {}, clientId, sessionId, jobId: providedJobId } = job.data;

    // Use provided jobId or fall back to job.id
    const jobId = providedJobId || job.id;

    console.log(`[ResearchWorker] Processing job: ${jobId} (job.id: ${job.id})`);
    console.log(`[ResearchWorker] Query: ${query}`);
    console.log(`[ResearchWorker] ClientId: ${clientId || 'none'}`);

    if (!query) {
      throw new Error('query-required');
    }

    const startTime = Date.now();

    try {
      // 1. Send started event
      publishEvent(jobId, clientId, sessionId, 'started', {
        query,
        lang,
        timestamp: startTime,
      });

      // 2. Detect query language
      const detection = detectLanguage(query, lang);
      const queryLang = detection.language || 'en';

      // 3. Multi-source search
      publishEvent(jobId, clientId, sessionId, 'searching', {
        query,
        lang: queryLang,
      });

      const sources = await multiSourceSearch(query, {
        lang: queryLang,
        maxResults: options.maxSources || 8,
      });

      if (sources.length === 0) {
        throw new Error('No sources found');
      }

      // 4. Send sources event
      publishEvent(jobId, clientId, sessionId, 'sources', {
        sources: sources.map(s => ({
          url: s.url,
          title: s.title,
          snippet: s.snippet,
          source: s.source,
          score: s.score,
          lang: s.lang,
        })),
        count: sources.length,
      });

      // 5. Fetch and extract content from sources
      publishEvent(jobId, clientId, sessionId, 'extracting', {
        count: sources.length,
      });

      const pages = await extractMultipleContent(sources, {
        concurrency: 4,
        timeout: 10000,
      });

      // Filter out failed extractions
      const successfulPages = pages.filter(p => !p.error && p.text.length > 100);

      if (successfulPages.length === 0) {
        throw new Error('Failed to extract content from sources');
      }

      // 6. Send pages event
      publishEvent(jobId, clientId, sessionId, 'pages', {
        pages: successfulPages.map(p => ({
          url: p.url,
          title: p.title || p.originalTitle,
          lang: p.lang,
          textLength: p.text.length,
          source: p.source,
        })),
        count: successfulPages.length,
      });

      // 7. Chunk and embed pages
      publishEvent(jobId, clientId, sessionId, 'chunking', {
        count: successfulPages.length,
      });

      const allChunks = [];
      for (const page of successfulPages) {
        const pageChunks = chunkText(page.text, {
          maxChunkSize: 800,
          overlap: 100,
        });

        for (let chunkIdx = 0; chunkIdx < pageChunks.length; chunkIdx++) {
          const chunk = pageChunks[chunkIdx];
          allChunks.push({
            ...chunk,
            chunkIdx,
            url: page.url,
            title: page.title || page.originalTitle,
            source: page.source,
            lang: page.lang,
          });
        }
      }

      publishEvent(jobId, clientId, sessionId, 'chunksReady', {
        count: allChunks.length,
      });

      // 8. Upsert chunks to vector store
      const enrichedChunks = await upsertChunks(job.id, allChunks);

      publishEvent(jobId, clientId, sessionId, 'embeddingsUpserted', {
        count: enrichedChunks.length,
      });

      // 9. Semantic search: retrieve most relevant chunks
      publishEvent(jobId, clientId, sessionId, 'retrieving', {
        query,
      });

      const topChunks = await semanticSearch(query, enrichedChunks, {
        topK: options.maxChunks || 12,
        minScore: 0.3,
      });

      publishEvent(jobId, clientId, sessionId, 'retrieved', {
        items: topChunks.map(c => ({
          url: c.url,
          title: c.title,
          score: c.score,
          chunkIdx: c.chunkIdx,
        })),
        count: topChunks.length,
      });

      // 10. Build reasoning prompt with chain-of-thought instructions
      const { system, user, passages } = buildReasoningPrompt(query, topChunks, {
        includeReasoning: true,
        maxChunks: 12,
      });

      // 11. Stream LLM with reasoning chain
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];

      // Use Ollama by default (FREE) - only use OpenAI if explicitly forced
      const defaultModel = process.env.OLLAMA_MODEL || 'llama3.1';
      const model = options.model || defaultModel;
      const provider =
        process.env.LLM_PROVIDER ||
        (process.env.FORCE_OPENAI === 'true' && process.env.OPENAI_API_KEY ? 'openai' : 'ollama');

      let fullSummary = '';
      let chunkIndex = 0;

      publishEvent(jobId, clientId, sessionId, 'summarizing', {
        model,
        provider,
      });

      if (provider === 'ollama' || process.env.FORCE_OPENAI !== 'true') {
        await callOllamaStream(
          messages,
          { model, temperature: 0.2 },
          {
            onToken: token => {
              fullSummary += token;
              chunkIndex++;
              publishEvent(jobId, clientId, sessionId, 'chunk', {
                token,
                index: chunkIndex,
                accumulated: fullSummary,
              });
            },
          }
        );
      } else {
        const _result = await callOpenAIStream(
          messages,
          { model, temperature: 0.2 },
          {
            onToken: token => {
              fullSummary += token;
              chunkIndex++;
              publishEvent(jobId, clientId, sessionId, 'chunk', {
                token,
                index: chunkIndex,
                accumulated: fullSummary,
              });
            },
          }
        );
      }

      // 12. Extract citations, reasoning steps, and sources
      const citations = extractCitations(fullSummary, passages);
      const reasoningSteps = extractReasoningSteps(fullSummary);
      const sourcesList =
        extractSourcesList(fullSummary, passages) ||
        citations.map(c => ({
          id: c.id,
          url: c.url,
          title: c.title,
          score: 0.8,
        }));

      // 13. Calculate citation coverage and hallucination risk
      const citationCoverage = calculateCitationCoverage(fullSummary, citations, passages);
      const hallucinationAnalysis = await estimateHallucinationRisk(
        fullSummary,
        citations,
        passages
      );

      // 14. Extract answer (first paragraph before Reasoning)
      const answerMatch = fullSummary.match(/^(.*?)(?:\n\nReasoning:|$)/s);
      const answer = answerMatch ? answerMatch[1].trim() : fullSummary.split('\n\n')[0];

      // 15. Send reasoning steps as they're extracted
      if (reasoningSteps.length > 0) {
        publishEvent(jobId, clientId, sessionId, 'reasoning', {
          steps: reasoningSteps,
        });
      }

      // 16. Send evidence for key claims
      const keyClaims = answer
        .split(/[.!?]+/)
        .filter(s => s.trim().length > 20)
        .slice(0, 3);
      for (const claim of keyClaims) {
        const evidence = extractEvidenceForClaim(claim, passages, citations);
        if (evidence.length > 0) {
          publishEvent(jobId, clientId, sessionId, 'evidence', {
            claim: claim.trim(),
            evidence: evidence.map(e => ({
              url: e.chunk.url,
              title: e.chunk.title,
              score: e.score,
              isCited: e.isCited,
              excerpt: e.chunk.content.slice(0, 200),
            })),
          });
        }
      }

      // 17. Send done event with full analysis
      publishEvent(jobId, clientId, sessionId, 'done', {
        answer,
        fullResponse: fullSummary,
        reasoningSteps,
        citations: citations.map(c => ({
          id: c.id,
          url: c.url,
          title: c.title,
          position: c.position,
        })),
        sources:
          sourcesList.length > 0
            ? sourcesList
            : successfulPages.map(p => ({
                id: successfulPages.indexOf(p) + 1,
                url: p.url,
                title: p.title || p.originalTitle,
                snippet: p.snippet,
                source: p.source,
                lang: p.lang,
                score: 0.8,
              })),
        citationCount: citations.length,
        citationCoverage,
        hallucinationRisk: hallucinationAnalysis.risk,
        hallucinationScore: hallucinationAnalysis.score,
        hallucinationDetails: {
          unsupportedClaims: hallucinationAnalysis.unsupportedClaims,
          totalClaims: hallucinationAnalysis.totalClaims,
        },
        duration: Date.now() - startTime,
        queryLang,
        chunksUsed: topChunks.length,
        totalChunks: allChunks.length,
      });

      // Update job with result
      await job.update({
        result: {
          summary: fullSummary,
          sources: successfulPages,
          citationCount,
          citationCoverage,
        },
      });

      return {
        summary: fullSummary,
        sources: successfulPages,
        citationCount,
        citationCoverage,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[ResearchWorker] Error processing job ${job.id}:`, error);

      publishEvent(jobId, clientId, sessionId, 'error', {
        error: error.message,
        timestamp: Date.now(),
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 research jobs concurrently
  }
);

worker.on('completed', async job => {
  console.log(`[ResearchWorker] Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
  console.error(`[ResearchWorker] Job ${job.id} failed:`, err.message);
});

worker.on('error', err => {
  // Suppress Redis connection errors
  if (err && typeof err === 'object') {
    const code = err.code;
    const message = err?.message || '';
    const stack = err?.stack || '';
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'MaxRetriesPerRequestError' ||
      message.includes('Connection is closed') ||
      message.includes('ECONNREFUSED') ||
      message.includes('127.0.0.1:6379') ||
      err.name === 'ConnectionClosedError' ||
      stack.includes('connectionCloseHandler') ||
      stack.includes('ioredis')
    ) {
      return;
    }
  }
  console.error('[ResearchWorker] error', err);
});

console.log('[ResearchWorker] Started and ready to process research jobs');
