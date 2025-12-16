/**
 * Realtime Server Integration
 * 
 * Wires together: Socket.IO server, Redis, Worker, Job State Machine
 */

import express from 'express';
import { createServer } from 'http';
import { createClient } from 'redis';
import { fileURLToPath } from 'url';
import { initRealtimeServer } from './realtime';
import { StreamingWorker } from './streamingWorker';
import { createInMemoryJobManager, JobStateManager } from './jobState';

const app = express();
const httpServer = createServer(app);

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3000;

let io: any;
let redisClient: any;
let worker: StreamingWorker;
let jobManager: JobStateManager;

/**
 * Initialize and start realtime server
 */
export async function startRealtimeServer() {
  try {
    console.log('[Server] Starting Regen Realtime Server...');

    // Initialize Redis
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
    console.log('[Server] Redis connected');

    // Initialize job manager (in-memory for server, can be replaced with DB)
    jobManager = createInMemoryJobManager();
    console.log('[Server] Job manager initialized');

    // Initialize Socket.IO server
    io = await initRealtimeServer(httpServer, {
      jwtSecret: JWT_SECRET,
      redisUrl: REDIS_URL,
    });
    console.log('[Server] Realtime server initialized');

    // Initialize worker
    worker = new StreamingWorker({ redisUrl: REDIS_URL });
    await worker.initialize();
    console.log('[Server] Worker initialized');

    // Setup job handlers
    setupJobHandlers();

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        redis: redisClient.isOpen ? 'connected' : 'disconnected',
      });
    });

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
      console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return { io, redisClient, worker, jobManager };
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    throw error;
  }
}

/**
 * Setup Socket.IO job handlers
 */
function setupJobHandlers() {
  if (!io) throw new Error('Socket.IO not initialized');

  io.on('connection', (socket: any) => {
    const userId = socket.data.userId;

    // Handle job start
    socket.on('start:job', async (payload: any, callback: (response: { jobId?: string; error?: string }) => void) => {
      try {
        console.log(`[Server] User ${userId} starting job: ${payload.type}`);

        // Create job in state manager
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await jobManager.createJob({
          id: jobId,
          userId,
          type: payload.type,
          input: payload.input,
        });

        // Start job in background
        executeJobInBackground(jobId, userId, payload);

        // Acknowledge job start
        callback({ jobId });

        console.log(`[Server] Job ${jobId} created for user ${userId}`);
      } catch (error) {
        console.error('[Server] Failed to start job:', error);
        callback({ error: error instanceof Error ? error.message : 'Failed to start job' });
      }
    });
  });
}

/**
 * Execute job in background (non-blocking)
 */
async function executeJobInBackground(
  jobId: string,
  userId: string,
  payload: { type: string; input: any }
) {
  try {
    // Mark job as started
    await jobManager.startJob(jobId);

    // Execute based on job type
    await worker.executeJob(
      {
        userId,
        jobId,
        type: payload.type,
        input: payload.input,
      },
      async (ctx, streamer) => {
        // Example: Simulate LLM or processing job
        const duration = ctx.input.duration || 10; // seconds
        const chunkCount = ctx.input.chunks || 50;
        const chunkDelay = (duration * 1000) / chunkCount;

        let output = '';

        for (let i = 0; i < chunkCount; i++) {
          // Simulate chunk generation
          await new Promise(resolve => setTimeout(resolve, chunkDelay));

          const chunk = `[${i + 1}/${chunkCount}] Generated content... `;
          output += chunk;

          // Stream chunk
          await streamer.emitChunk(chunk);

          // Update progress
          await streamer.emitProgress({
            current: i + 1,
            total: chunkCount,
            message: `Processing ${i + 1}/${chunkCount}`,
          });

          // Update job progress in state manager
          await jobManager.updateProgress(jobId, {
            current: i + 1,
            total: chunkCount,
          });
        }

        // Complete job
        await jobManager.completeJob(jobId, { output });

        return { output, chunks: chunkCount };
      }
    );
  } catch (error) {
    console.error(`[Server] Job ${jobId} failed:`, error);
    await jobManager.failJob(
      jobId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('[Server] Shutting down gracefully...');

  try {
    // Stop accepting new connections
    if (io) {
      await (io as any).close();
    }

    // Close HTTP server
    httpServer.close();

    // Shutdown worker
    if (worker) {
      await worker.shutdown();
    }

    // Close Redis
    if (redisClient) {
      await redisClient.quit();
    }

    console.log('[Server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
}

// Auto-start if running directly (ESM version)
const __filename = fileURLToPath(import.meta.url);

// Check if this module is being run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startRealtimeServer().catch(error => {
    console.error('[Server] Fatal error:', error);
    process.exit(1);
  });
}
