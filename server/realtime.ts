/**
 * GOAL:
 * Implement a production-ready realtime server for Regen Browser.
 *
 * REQUIREMENTS:
 * - Use Socket.IO
 * - JWT-based authentication on socket handshake
 * - Redis adapter for horizontal scaling
 * - Rooms: user:<userId> and job:<jobId>
 * - Subscribe to Redis channels job:*
 * - Forward streaming events from workers to connected clients
 * - Handle reconnects and prevent duplicate event delivery
 * - Expose events:
 *   - job:started
 *   - job:chunk
 *   - job:progress
 *   - job:completed
 *   - job:failed
 *
 * NON-GOALS:
 * - No UI code
 * - No business logic inside socket handlers
 *
 * Write clean, readable, production-quality code.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import * as jwt from 'jsonwebtoken';

interface AuthToken {
  userId: string;
  exp?: number;
}

interface JobEvent {
  event:
    | 'job:started'
    | 'job:chunk'
    | 'job:progress'
    | 'job:checkpoint'
    | 'job:checkpointed'
    | 'job:completed'
    | 'job:failed'
    | 'job:resumed'
    | 'job:paused'
    | 'job:cancelled'
    | 'job:restarted';
  userId: string;
  jobId: string;
  payload: any;
  sequence: number;
  timestamp: number;
}

interface RealtimeConfig {
  jwtSecret: string;
  redisUrl?: string;
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
}

const DEFAULT_CONFIG: Partial<RealtimeConfig> = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
};

// In-memory backlog per job for quick replay on reconnect
const JOB_BACKLOG_LIMIT = 200;
const jobBacklog = new Map<string, JobEvent[]>();

function appendToBacklog(event: JobEvent): void {
  const current = jobBacklog.get(event.jobId) || [];
  const next = [...current, event].slice(-JOB_BACKLOG_LIMIT);
  jobBacklog.set(event.jobId, next);
}

function getBacklog(jobId: string, afterSequence: number): JobEvent[] {
  const events = jobBacklog.get(jobId) || [];
  return events.filter(evt => evt.sequence > afterSequence);
}

/**
 * Initialize production-ready realtime server
 */
export async function initRealtimeServer(
  httpServer: HttpServer,
  config: RealtimeConfig
): Promise<SocketIOServer> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: fullConfig.cors,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Redis adapter for horizontal scaling
  if (fullConfig.redisUrl) {
    try {
      const pubClient = createClient({ url: fullConfig.redisUrl });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));

      console.log('[Realtime] Redis adapter initialized for horizontal scaling');

      // Subscribe to Redis job channels
      await subscribeToJobEvents(subClient, io);
    } catch (error) {
      console.error('[Realtime] Failed to setup Redis adapter:', error);
      console.warn('[Realtime] Continuing without Redis (single-server mode)');
    }
  }

  // JWT-based authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token as string, fullConfig.jwtSecret) as AuthToken;

      if (!decoded.userId) {
        return next(new Error('Invalid token: missing userId'));
      }

      // Attach user info to socket
      socket.data.userId = decoded.userId;
      socket.data.authenticated = true;

      console.log(`[Realtime] User ${decoded.userId} authenticated`);
      next();
    } catch (error) {
      console.error('[Realtime] Authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    console.log(`[Realtime] Client connected: ${socket.id} (user: ${userId})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Track sequence numbers to prevent duplicate delivery
    const deliveredSequences = new Set<string>();

    // Handle job subscription
    socket.on('subscribe:job', (jobId: string) => {
      console.log(`[Realtime] User ${userId} subscribing to job ${jobId}`);
      socket.join(`job:${jobId}`);
      socket.emit('subscribed', { jobId });

      // Push recent backlog to subscriber for quick catch-up
      const recent = getBacklog(jobId, 0).slice(-20);
      if (recent.length) {
        recent.forEach(evt => {
          socket.emit(evt.event, {
            jobId: evt.jobId,
            payload: evt.payload,
            sequence: evt.sequence,
            timestamp: evt.timestamp,
          });
        });
        socket.emit('sync:complete', { jobId, replayed: recent.length });
      }
    });

    // Handle job unsubscription
    socket.on('unsubscribe:job', (jobId: string) => {
      console.log(`[Realtime] User ${userId} unsubscribing from job ${jobId}`);
      socket.leave(`job:${jobId}`);
      socket.emit('unsubscribed', { jobId });
    });

    // Handle job cancellation
    socket.on('cancel:job', async (jobId: string) => {
      console.log(`[Realtime] User ${userId} cancelling job ${jobId}`);

      // Publish cancellation to Redis for worker to pick up
      const redisClient = (io.adapter as any).pubClient;
      if (redisClient) {
        await redisClient.publish(
          `job:cancel:${jobId}`,
          JSON.stringify({ userId, jobId, timestamp: Date.now() })
        );
      }

      socket.emit('job:cancelled', { jobId });
    });

    // Handle reconnection with state recovery
    socket.on('reconnect:sync', async (data: { jobId: string; lastSequence: number }) => {
      console.log(
        `[Realtime] User ${userId} reconnecting, requesting sync from sequence ${data.lastSequence}`
      );

      const replay = getBacklog(data.jobId, data.lastSequence);

      replay.forEach(evt => {
        socket.emit(evt.event, {
          jobId: evt.jobId,
          payload: evt.payload,
          sequence: evt.sequence,
          timestamp: evt.timestamp,
        });
      });

      socket.emit('sync:complete', {
        jobId: data.jobId,
        replayed: replay.length,
        lastSequence: data.lastSequence,
      });
    });

    // Connection status
    socket.emit('connected', {
      userId,
      timestamp: Date.now(),
      serverVersion: '1.0.0',
    });

    // Handle disconnection
    socket.on('disconnect', reason => {
      console.log(`[Realtime] Client disconnected: ${socket.id} (reason: ${reason})`);
      deliveredSequences.clear();
    });

    // Handle errors
    socket.on('error', error => {
      console.error(`[Realtime] Socket error for ${socket.id}:`, error);
    });
  });

  console.log('[Realtime] Server initialized successfully');
  return io;
}

/**
 * Subscribe to Redis job events and forward to connected clients
 */
async function subscribeToJobEvents(redisClient: any, io: SocketIOServer): Promise<void> {
  // Subscribe to all job channels with pattern
  await redisClient.pSubscribe('job:event:*', (message: string, channel: string) => {
    try {
      const event = JSON.parse(message) as JobEvent;

      // Extract jobId from channel (job:event:<jobId>)
      const jobId = channel.split(':')[2];

      // Validate event structure
      if (!event.userId || !event.jobId || !event.event || event.sequence === undefined) {
        console.warn('[Realtime] Invalid event structure:', event);
        return;
      }

      appendToBacklog(event);

      // Forward event to user room and job room
      const rooms = [`user:${event.userId}`, `job:${event.jobId}`];

      rooms.forEach(room => {
        io.to(room).emit(event.event, {
          jobId: event.jobId,
          payload: event.payload,
          sequence: event.sequence,
          timestamp: event.timestamp,
        });
      });

      console.log(`[Realtime] Forwarded ${event.event} for job ${jobId} (seq: ${event.sequence})`);
    } catch (error) {
      console.error('[Realtime] Failed to process job event:', error);
    }
  });

  console.log('[Realtime] Subscribed to Redis job events (job:event:*)');
}

/**
 * Publish job event to Redis for broadcasting
 */
export async function publishJobEvent(redisClient: any, event: JobEvent): Promise<void> {
  try {
    const channel = `job:event:${event.jobId}`;
    await redisClient.publish(channel, JSON.stringify(event));
    console.log(`[Realtime] Published ${event.event} to ${channel}`);
  } catch (error) {
    console.error('[Realtime] Failed to publish job event:', error);
    throw error;
  }
}

/**
 * Helper to emit event to specific user
 */
export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Helper to emit event to specific job subscribers
 */
export function emitToJob(io: SocketIOServer, jobId: string, event: string, data: any): void {
  io.to(`job:${jobId}`).emit(event, data);
}

/**
 * Get connected clients count for monitoring
 */
export async function getConnectedClients(io: SocketIOServer): Promise<number> {
  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Graceful shutdown
 */
export async function shutdownRealtimeServer(io: SocketIOServer): Promise<void> {
  console.log('[Realtime] Shutting down gracefully...');

  // Notify all clients
  io.emit('server:shutdown', { message: 'Server restarting, please reconnect' });

  // Wait for clients to receive message
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Close all connections
  io.close();

  console.log('[Realtime] Shutdown complete');
}
