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

/**
 * POST /api/research/run
 * Start a research job and return jobId immediately
 * Progress will be streamed via WebSocket
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

    // Enqueue research job
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
