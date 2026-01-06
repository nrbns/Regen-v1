/**
 * Worker Integration Example
 * Shows how to use realtime job publishing in a worker
 *
 * This is a template - adapt to your actual worker implementation
 */

import Redis from 'ioredis';
import {
  initJobPublisher,
  publishJobProgress,
  publishJobChunk,
  publishJobCheckpoint,
  publishJobComplete,
  publishJobError,
} from './jobPublisher';

/**
 * Example: AI agent worker with realtime progress
 */
export async function runAgentJob(
  redis: Redis,
  jobId: string,
  userId: string,
  query: string
): Promise<any> {
  const startTime = Date.now();

  // Initialize publisher (auto-logs events)
  initJobPublisher(redis);

  try {
    // Step 1: Analyze query
    await publishJobProgress(redis, jobId, userId, 'running', 'Analyzing query', 10);
    console.log('[Worker] Analyzing query:', query);
    // ... analysis logic ...
    await new Promise(r => setTimeout(r, 500)); // Simulated work

    // Step 2: Search sources
    await publishJobProgress(redis, jobId, userId, 'running', 'Searching sources', 30);
    console.log('[Worker] Searching sources...');
    // ... search logic ...
    let sourceCount = 0;
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 200));
      sourceCount++;
      await publishJobProgress(
        redis,
        jobId,
        userId,
        'running',
        `Searching sources (${sourceCount}/5)`,
        30 + sourceCount * 4
      );
    }

    // Step 3: Generate response (with streaming)
    await publishJobProgress(redis, jobId, userId, 'running', 'Generating response', 60);
    console.log('[Worker] Generating response...');

    let responseText = '';
    const chunks = [
      'The AI agent ecosystem has evolved significantly. ',
      'Key players include OpenAI with GPT models, ',
      'Anthropic with Claude, and open-source models like Llama. ',
      'These agents can perform complex reasoning and planning. ',
      'They are increasingly used in enterprise automation.',
    ];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      responseText += chunk;

      // Publish streaming chunk
      await publishJobChunk(redis, jobId, userId, chunk, i === chunks.length - 1);

      // Update progress
      const progressPercent = 60 + ((i + 1) / chunks.length) * 20;
      await publishJobProgress(
        redis,
        jobId,
        userId,
        'running',
        'Generating response',
        progressPercent
      );

      await new Promise(r => setTimeout(r, 100));
    }

    // Step 4: Save checkpoint (for resume capability)
    await publishJobCheckpoint(
      redis,
      jobId,
      userId,
      {
        responseText,
        sourcesUsed: sourceCount,
        timestamp: Date.now(),
      },
      85
    );

    // Step 5: Finalize
    await publishJobProgress(redis, jobId, userId, 'running', 'Finalizing', 95);
    console.log('[Worker] Finalizing...');
    await new Promise(r => setTimeout(r, 300));

    // Completion
    const result = {
      answer: responseText,
      sources: sourceCount,
      processingTime: Date.now() - startTime,
    };

    const durationMs = Date.now() - startTime;
    await publishJobComplete(redis, jobId, userId, result, durationMs);

    console.log(`[Worker] Job ${jobId} completed successfully in ${durationMs}ms`);
    return result;
  } catch (error: any) {
    console.error(`[Worker] Job ${jobId} failed:`, error);
    await publishJobError(redis, jobId, userId, error.message, false);
    throw error;
  }
}

/**
 * Example: Search worker
 */
export async function runSearchJob(
  redis: Redis,
  jobId: string,
  userId: string,
  query: string
): Promise<any> {
  try {
    await publishJobProgress(redis, jobId, userId, 'running', 'Parsing query', 5);

    // Simulated search work
    const results = [];
    for (let i = 0; i < 10; i++) {
      await publishJobProgress(
        redis,
        jobId,
        userId,
        'running',
        `Fetching results (${i + 1}/10)`,
        10 + i * 8
      );

      results.push({
        id: i,
        title: `Result ${i + 1}`,
        url: `https://example.com/${i}`,
        snippet: `Relevant result for "${query}"`,
      });

      await new Promise(r => setTimeout(r, 100));
    }

    await publishJobProgress(redis, jobId, userId, 'running', 'Ranking results', 90);
    await new Promise(r => setTimeout(r, 200));

    const durationMs = Date.now() - Date.now(); // For demo
    await publishJobComplete(redis, jobId, userId, { results }, durationMs);

    return { results };
  } catch (error: any) {
    await publishJobError(redis, jobId, userId, error.message);
    throw error;
  }
}

/**
 * Main worker entry point
 */
export async function processJob(job: any): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  try {
    console.log(`[Worker] Processing job ${job.id}`);

    switch (job.type) {
      case 'agent':
        await runAgentJob(redis, job.id, job.userId, job.query);
        break;
      case 'search':
        await runSearchJob(redis, job.id, job.userId, job.query);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  } finally {
    try {
      await redis.quit();
    } catch {
      // ignore
    }
  }
}
