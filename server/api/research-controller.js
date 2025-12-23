/**
 * Research Controller
 * Handles research API requests with job queue integration
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

import { enqueueResearchJob, getResearchJobStatus } from '../services/queue/researchQueue.js';
import { generateResearchAnswer } from '../services/research/answer.js';
import { generateEnhancedAnswer } from '../services/research/enhanced-answer.js';
import { enhanceResearchResult } from './research-enhanced.js';

/**
 * POST /api/research/run
 * Start a research job and return jobId immediately
 * Progress will be streamed via WebSocket
 * FIX: Fallback to direct processing if queue unavailable
 */
export async function runResearch(req, reply) {
  try {
    const { query, lang = 'auto', options = {}, clientId, sessionId } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return reply.code(400).send({
        error: 'Invalid query',
        message: 'Query must be at least 2 characters',
      });
    }

    // Try queue first, fallback to direct processing if queue unavailable
    try {
      const { jobId, status, estimatedWait } = await enqueueResearchJob(
        {
          query: query.trim(),
          lang,
          options,
          clientId: clientId || req.body.clientId,
          sessionId: sessionId || req.body.sessionId,
          userId: req.user?.id,
        },
        {
          priority: 1,
        }
      );

      return reply.send({
        jobId,
        status,
        estimatedWait,
        message: 'Research job queued. Progress will be streamed via WebSocket.',
        websocketUrl: `/agent/stream?clientId=${clientId || 'anonymous'}&sessionId=${sessionId || 'default'}`,
      });
    } catch (queueError) {
      // Queue unavailable (Redis not running or connection failed)
      // Fallback to direct processing for immediate answers
      console.warn(
        '[ResearchController] Queue unavailable, processing directly:',
        queueError.message
      );

      try {
        // Use enhanced answer generation (parallel agents + golden prompts)
        // Falls back to regular answer if enhanced fails
        let answer;
        try {
          answer = await generateEnhancedAnswer({
            query: query.trim(),
            max_context_tokens: options.maxChunks ? options.maxChunks * 200 : 2000,
            includeTwitter: options.includeTwitter !== false,
            includePDF: options.includePDF !== false,
            includeGitHub: options.includeGitHub !== false,
            includeArxiv: options.includeArxiv !== false,
            language: lang === 'auto' ? undefined : lang,
          });
        } catch (enhancedError) {
          console.warn(
            '[ResearchController] Enhanced answer failed, using regular:',
            enhancedError.message
          );
          // Fallback to regular answer generation
          answer = await generateResearchAnswer({
            query: query.trim(),
            max_context_tokens: options.maxChunks ? options.maxChunks * 200 : 1500,
            language: lang === 'auto' ? undefined : lang,
            return_documents: true,
          });
        }

        // Enhance with related questions
        const enhanced = enhanceResearchResult(
          {
            answer: answer.answer,
            citations: answer.citations,
            model: answer.model,
            query_id: answer.query_id,
            sources: answer.documents || [],
          },
          query.trim(),
          answer.documents || []
        );

        // Return answer directly (no streaming, but immediate response)
        return reply.send({
          jobId: `direct-${Date.now()}`,
          status: 'completed',
          answer: enhanced.answer,
          citations: enhanced.citations,
          model: enhanced.model,
          query_id: enhanced.query_id,
          relatedQuestions: enhanced.relatedQuestions,
          direct: true, // Indicates direct processing (no WebSocket streaming)
          message: 'Answer generated directly (queue unavailable)',
        });
      } catch (answerError) {
        console.error('[ResearchController] Direct processing failed:', answerError);
        return reply.code(500).send({
          error: 'Failed to generate answer',
          message: answerError.message,
          queueError: queueError.message,
        });
      }
    }
  } catch (error) {
    console.error('[ResearchController] Error:', error);
    return reply.code(500).send({
      error: 'Failed to start research job',
      message: error.message,
    });
  }
}

/**
 * GET /api/research/status/:jobId
 * Get research job status
 */
export async function getResearchStatus(req, reply) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return reply.code(400).send({
        error: 'Missing jobId',
      });
    }

    const status = await getResearchJobStatus(jobId);

    if (!status) {
      return reply.code(404).send({
        error: 'Job not found',
      });
    }

    return reply.send(status);
  } catch (error) {
    console.error('[ResearchController] Error:', error);
    return reply.code(500).send({
      error: 'Failed to get job status',
      message: error.message,
    });
  }
}
