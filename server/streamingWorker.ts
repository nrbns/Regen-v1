/**
 * GOAL:
 * Stream long-running job progress to clients in real time.
 *
 * REQUIREMENTS:
 * - Publish events to Redis channel `job:<jobId>`
 * - Events must include:
 *   { event, userId, jobId, payload, sequence }
 * - Publish partial output chunks as they are generated
 * - Save checkpoint every N chunks (configurable)
 * - Support graceful cancellation
 *
 * EVENTS:
 * - job:chunk
 * - job:progress
 * - job:completed
 * - job:failed
 *
 * IMPORTANT:
 * - Do NOT block event loop
 * - Use async iteration where possible
 */

import { createClient, RedisClientType } from 'redis';
import { publishJobEvent } from './realtime';

interface WorkerConfig {
  redisUrl?: string;
  checkpointInterval?: number; // Checkpoint every N chunks (default: 10)
}

interface JobContext {
  userId: string;
  jobId: string;
  type: string;
  input: any;
}

interface JobCheckpoint {
  jobId: string;
  sequence: number;
  partialOutput: any;
  timestamp: number;
}

export class StreamingWorker {
  private redis: RedisClientType;
  private config: Required<WorkerConfig>;
  private cancelledJobs = new Set<string>();
  private sequenceCounters = new Map<string, number>();

  constructor(config: WorkerConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      checkpointInterval: config.checkpointInterval || 10,
    };

    this.redis = createClient({ url: this.config.redisUrl }) as RedisClientType;
  }

  /**
   * Initialize worker and connect to Redis
   */
  async initialize(): Promise<void> {
    await this.redis.connect();
    console.log('[Worker] Connected to Redis');

    // Subscribe to job cancellation events
    const cancelSub = this.redis.duplicate();
    await cancelSub.connect();

    await cancelSub.pSubscribe('job:cancel:*', (message: string, channel: string) => {
      const jobId = channel.split(':')[2];
      console.log(`[Worker] Received cancellation for job ${jobId}`);
      this.cancelledJobs.add(jobId);
    });
  }

  /**
   * Execute job with streaming progress
   */
  async executeJob(
    context: JobContext,
    processFn: (ctx: JobContext, streamer: JobStreamer) => Promise<any>
  ): Promise<void> {
    const { jobId, userId } = context;

    console.log(`[Worker] Starting job ${jobId} for user ${userId}`);

    // Initialize sequence counter
    this.sequenceCounters.set(jobId, 0);

    // Create streamer for this job
    const streamer = new JobStreamer(
      this.redis,
      context,
      this.config.checkpointInterval,
      () => this.cancelledJobs.has(jobId)
    );

    try {
      // Emit job started
      await streamer.emitStarted();

      // Execute job with streaming
      const result = await processFn(context, streamer);

      // Check if cancelled
      if (this.cancelledJobs.has(jobId)) {
        console.log(`[Worker] Job ${jobId} was cancelled`);
        await streamer.emitFailed('Job cancelled by user');
        return;
      }

      // Emit completion
      await streamer.emitCompleted(result);

      console.log(`[Worker] Job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`[Worker] Job ${jobId} failed:`, error);
      await streamer.emitFailed(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Cleanup
      this.cancelledJobs.delete(jobId);
      this.sequenceCounters.delete(jobId);
    }
  }

  /**
   * Get next sequence number for job
   */
  private getNextSequence(jobId: string): number {
    const current = this.sequenceCounters.get(jobId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(jobId, next);
    return next;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Worker] Shutting down...');
    await this.redis.quit();
    console.log('[Worker] Shutdown complete');
  }
}

/**
 * Job streamer - handles event emission and checkpointing
 */
export class JobStreamer {
  private sequence = 0;
  private chunksSinceCheckpoint = 0;
  private partialOutput: any[] = [];

  constructor(
    private redis: RedisClientType,
    private context: JobContext,
    private checkpointInterval: number,
    private isCancelled: () => boolean
  ) {}

  /**
   * Emit job started event
   */
  async emitStarted(): Promise<void> {
    await this.emitEvent('job:started', {
      type: this.context.type,
      input: this.context.input,
    });
  }

  /**
   * Emit chunk of output (streaming)
   */
  async emitChunk(chunk: string | object): Promise<void> {
    // Check cancellation before emitting
    if (this.isCancelled()) {
      throw new Error('Job cancelled');
    }

    await this.emitEvent('job:chunk', { chunk });

    // Track for checkpoint
    this.partialOutput.push(chunk);
    this.chunksSinceCheckpoint++;

    // Save checkpoint if interval reached
    if (this.chunksSinceCheckpoint >= this.checkpointInterval) {
      await this.saveCheckpoint();
      this.chunksSinceCheckpoint = 0;
    }
  }

  /**
   * Emit progress update
   */
  async emitProgress(progress: {
    current: number;
    total: number;
    message?: string;
  }): Promise<void> {
    if (this.isCancelled()) {
      throw new Error('Job cancelled');
    }

    await this.emitEvent('job:progress', {
      progress: {
        ...progress,
        percentage: (progress.current / progress.total) * 100,
      },
    });
  }

  /**
   * Emit job completed event
   */
  async emitCompleted(result: any): Promise<void> {
    await this.emitEvent('job:completed', { result });

    // Clear checkpoint
    await this.clearCheckpoint();
  }

  /**
   * Emit job failed event
   */
  async emitFailed(error: string): Promise<void> {
    await this.emitEvent('job:failed', {
      error,
      partialOutput: this.partialOutput,
    });

    // Save final checkpoint for potential retry
    await this.saveCheckpoint();
  }

  /**
   * Save checkpoint to Redis
   */
  private async saveCheckpoint(): Promise<void> {
    const checkpoint: JobCheckpoint = {
      jobId: this.context.jobId,
      sequence: this.sequence,
      partialOutput: this.partialOutput,
      timestamp: Date.now(),
    };

    await this.redis.setEx(
      `checkpoint:${this.context.jobId}`,
      3600, // 1 hour TTL
      JSON.stringify(checkpoint)
    );

    console.log(
      `[Worker] Checkpoint saved for job ${this.context.jobId} (seq: ${this.sequence})`
    );
  }

  /**
   * Load checkpoint from Redis
   */
  async loadCheckpoint(): Promise<JobCheckpoint | null> {
    const data = await this.redis.get(`checkpoint:${this.context.jobId}`);
    if (!data) return null;

    return JSON.parse(data);
  }

  /**
   * Clear checkpoint
   */
  private async clearCheckpoint(): Promise<void> {
    await this.redis.del(`checkpoint:${this.context.jobId}`);
  }

  /**
   * Emit event to Redis
   */
  private async emitEvent(event: string, payload: any): Promise<void> {
    this.sequence++;

    await publishJobEvent(this.redis as any, {
      event: event as any,
      userId: this.context.userId,
      jobId: this.context.jobId,
      payload,
      sequence: this.sequence,
      timestamp: Date.now(),
    });
  }

  /**
   * Helper: Stream from async generator
   */
  async *streamFromGenerator<T>(
    generator: AsyncGenerator<T>
  ): AsyncGenerator<T> {
    for await (const chunk of generator) {
      if (this.isCancelled()) {
        throw new Error('Job cancelled');
      }

      await this.emitChunk(chunk as any);
      yield chunk;
    }
  }
}

/**
 * Example: LLM streaming job
 */
export async function exampleStreamingJob(worker: StreamingWorker): Promise<void> {
  const context: JobContext = {
    userId: 'user123',
    jobId: 'job456',
    type: 'llm-completion',
    input: { prompt: 'Explain quantum computing' },
  };

  await worker.executeJob(context, async (ctx, streamer) => {
    // Simulate LLM streaming tokens
    const tokens = [
      'Quantum',
      ' computing',
      ' is',
      ' a',
      ' revolutionary',
      ' approach',
      ' to',
      ' computation',
      '...',
    ];

    let fullOutput = '';

    for (let i = 0; i < tokens.length; i++) {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stream token
      await streamer.emitChunk(tokens[i]);
      fullOutput += tokens[i];

      // Update progress
      await streamer.emitProgress({
        current: i + 1,
        total: tokens.length,
        message: `Generated ${i + 1}/${tokens.length} tokens`,
      });
    }

    return { output: fullOutput };
  });
}

/**
 * Example: Web scraping job with checkpoints
 */
export async function exampleScrapingJob(worker: StreamingWorker): Promise<void> {
  const context: JobContext = {
    userId: 'user123',
    jobId: 'job789',
    type: 'web-scraping',
    input: { urls: ['url1', 'url2', 'url3', 'url4', 'url5'] },
  };

  await worker.executeJob(context, async (ctx, streamer) => {
    const urls = ctx.input.urls;
    const results: any[] = [];

    for (let i = 0; i < urls.length; i++) {
      // Simulate scraping
      await new Promise(resolve => setTimeout(resolve, 500));

      const scrapedData = { url: urls[i], content: `Content from ${urls[i]}` };
      results.push(scrapedData);

      // Stream result
      await streamer.emitChunk(scrapedData);

      // Update progress
      await streamer.emitProgress({
        current: i + 1,
        total: urls.length,
        message: `Scraped ${i + 1}/${urls.length} URLs`,
      });
    }

    return { results };
  });
}
