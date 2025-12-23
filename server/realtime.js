/**
 * Socket.IO Real-Time Server
 * Unified real-time layer with Redis adapter for horizontal scaling
 *
 * PR 2: Realtime server implementation
 *
 * Features:
 * - JWT authentication
 * - Redis pub/sub for multi-instance support
 * - Event forwarding from workers
 * - Session management
 * - Graceful fallback if Redis unavailable
 *
 * Usage:
 *   const { initSocketIOServer } = require('./realtime');
 *   const { server, io } = initSocketIOServer(app);
 *   server.listen(4000);
 */

const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient } = require('./config/redis.js');
const { publish } = require('./pubsub.js');
const {
  trackSessionStart,
  trackSessionEnd,
  trackJobStarted,
  trackJobCompleted,
  trackJobFailed,
} = require('./analytics.js');

// Import shared events (fallback to object if not available)
let EVENTS;
try {
  // Try to load compiled JS version or TypeScript (if ts-node available)
  const eventsModule =
    require('../packages/shared/events.js') || require('../packages/shared/events');
  EVENTS = eventsModule?.EVENTS || eventsModule;
} catch {
  // Fallback event names if shared package not available
  EVENTS = {
    MODEL_CHUNK: 'model:chunk:v1',
    MODEL_COMPLETE: 'model:complete:v1',
    SEARCH_RESULT: 'search:result:v1',
    START_SEARCH: 'search:start:v1',
    CANCEL_TASK: 'task:cancel:v1',
    TASK_PROGRESS: 'task:progress:v1',
    DOWNLOAD_PROGRESS: 'download:progress:v1',
    USER_PRESENCE: 'user:presence:v1',
  };
}

// Simple JWT verification (replace with your auth system)
async function verifyToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  // TODO: Replace with actual JWT verification
  // For now, accept any token (dev mode)
  if (process.env.NODE_ENV === 'development') {
    return { id: token.substring(0, 8) || 'anonymous', token };
  }

  // In production, verify JWT
  // const jwt = require('jsonwebtoken');
  // return jwt.verify(token, process.env.JWT_SECRET);
  throw new Error('Token verification not implemented');
}

/**
 * Initialize Socket.IO server with Redis adapter
 */
function initSocketIOServer(app) {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'], // Fallback to polling for flaky networks
  });

  // Attach Redis adapter for horizontal scaling (optional)
  if (redisClient && process.env.REDIS_URL) {
    try {
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.IO] Redis adapter attached for multi-instance support');
    } catch (error) {
      console.warn('[Socket.IO] Redis adapter failed (continuing without it):', error.message);
    }
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token && process.env.NODE_ENV === 'production') {
        return next(new Error('Authentication required'));
      }

      const user = await verifyToken(token);
      socket.user = user;
      socket.userId = user.id;
      return next();
    } catch (error) {
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  // Connection handler
  io.on('connection', socket => {
    const userId = socket.userId;
    const sessionId = socket.id;

    console.log('[Socket.IO] Client connected', { userId, sessionId });

    // Track session start
    trackSessionStart(userId, sessionId).catch(() => {});

    // Join user room for targeted messaging
    socket.join(`user:${userId}`);
    socket.join(`session:${sessionId}`);

    // Emit connection confirmation
    socket.emit('connected', {
      sessionId,
      userId,
      timestamp: Date.now(),
    });

    // Handle search start
    socket.on(EVENTS.START_SEARCH || 'search:start:v1', async payload => {
      try {
        const { query } = payload;
        const jobId = `search_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        console.log('[Socket.IO] Search started', { userId, jobId, query });

        // Track job started
        trackJobStarted(jobId, userId, 'search').catch(() => {});

        // Emit start confirmation
        socket.emit(EVENTS.JOB_STARTED || 'job:started:v1', { jobId, query });

        // TODO: Enqueue search job to worker queue
        // For now, simulate with setTimeout
        setTimeout(() => {
          // Simulate search results
          socket.emit(EVENTS.SEARCH_RESULT || 'search:result:v1', {
            jobId,
            result: {
              title: `Result for: ${query}`,
              url: `https://example.com/search?q=${encodeURIComponent(query)}`,
              snippet: `Search results for ${query}...`,
              rank: 1,
            },
          });

          // Track completion
          trackJobCompleted(jobId, userId, 'search', 1000, 0).catch(() => {});
        }, 1000);
      } catch (error) {
        socket.emit('error', { message: error.message });
        trackJobFailed(jobId, userId, 'search', error).catch(() => {});
      }
    });

    // Handle task cancellation
    socket.on(EVENTS.CANCEL_TASK || 'task:cancel:v1', data => {
      const { jobId } = data;
      console.log('[Socket.IO] Task cancelled', { userId, jobId });

      // TODO: Cancel job in worker queue
      // Publish cancellation event to Redis
      publish(`job:${jobId}`, {
        type: 'cancelled',
        jobId,
        userId,
        timestamp: Date.now(),
      });

      socket.emit('task:cancelled', { jobId });
    });

    // Handle presence updates
    socket.on(EVENTS.USER_PRESENCE || 'user:presence:v1', data => {
      socket.broadcast.to(`user:${userId}`).emit(EVENTS.USER_PRESENCE || 'user:presence:v1', {
        userId,
        ...data,
        timestamp: Date.now(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', reason => {
      console.log('[Socket.IO] Client disconnected', { userId, sessionId, reason });

      // Track session end
      const sessionDuration = Date.now() - (socket.connectedAt || Date.now());
      trackSessionEnd(sessionId, sessionDuration).catch(() => {});

      // Emit leave event
      socket.broadcast.to(`user:${userId}`).emit('user:leave', {
        userId,
        timestamp: Date.now(),
      });
    });

    // Handle errors
    socket.on('error', error => {
      console.error('[Socket.IO] Socket error', { userId, sessionId, error: error.message });
    });
  });

  /**
   * Forward events from workers to connected clients
   * Called by workers via Redis pub/sub or direct function call
   */
  function forwardToSocket(channel, message) {
    try {
      // Channel format: user:123 or job:abcd or session:xyz
      if (channel.startsWith('user:')) {
        io.to(channel).emit(message.event, message.data);
      } else if (channel.startsWith('job:')) {
        // Broadcast to all clients (or specific job subscribers)
        io.emit(message.event, message.data);
      } else if (channel.startsWith('session:')) {
        io.to(channel).emit(message.event, message.data);
      } else {
        // Broadcast to all
        io.emit(message.event, message.data);
      }
    } catch (error) {
      console.error('[Socket.IO] Forward error', { channel, error: error.message });
    }
  }

  // Subscribe to Redis channels for worker events
  // PR3 Enhancement: Use psubscribe for pattern matching (job:*)
  if (redisClient) {
    try {
      const { subscribe, psubscribe } = require('./pubsub.js');

      // Pattern subscribe to all job events: job:*
      if (psubscribe) {
        psubscribe('job:*', (channel, message) => {
          try {
            const parsed = typeof message === 'string' ? JSON.parse(message) : message;

            // Channel format: job:<jobId>
            const jobId = channel.replace('job:', '');

            if (parsed.event && parsed.data) {
              // Forward to user room if userId available
              if (parsed.data.userId) {
                forwardToSocket(`user:${parsed.data.userId}`, {
                  event: parsed.event,
                  data: { ...parsed.data, jobId },
                });
              } else {
                // Broadcast to all (fallback)
                io.emit(parsed.event, { ...parsed.data, jobId });
              }
            }
          } catch (error) {
            console.warn('[Socket.IO] Failed to parse job message', {
              channel,
              error: error.message,
            });
          }
        });

        console.log('[Socket.IO] Pattern subscribed to job:* channels');
      }

      // Direct subscribe to specific channels (fallback)
      // Subscribe to job progress events
      subscribe('job:progress', message => {
        if (message.jobId && message.userId) {
          forwardToSocket(`user:${message.userId}`, {
            event: EVENTS.TASK_PROGRESS || 'task:progress:v1',
            data: message,
          });
        }
      });

      // Subscribe to model chunks
      subscribe('model:chunk', message => {
        if (message.jobId && message.userId) {
          forwardToSocket(`user:${message.userId}`, {
            event: EVENTS.MODEL_CHUNK || 'model:chunk:v1',
            data: message,
          });
        }
      });

      console.log('[Socket.IO] Subscribed to Redis channels');
    } catch (error) {
      console.warn('[Socket.IO] Redis subscription failed (optional):', error.message);
    }
  }

  return { server, io, forwardToSocket };
}

module.exports = { initSocketIOServer };
