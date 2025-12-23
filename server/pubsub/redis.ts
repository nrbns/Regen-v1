/**
 * Redis Pub/Sub Adapter
 * Bridges Redis channels with Socket.IO rooms
 */

import Redis from 'ioredis';
import type { Server as SocketIOServer } from 'socket.io';
import type { RealtimeEvent } from '../../packages/shared/events';

const CHANNEL_PREFIX = 'regen:';
const JOB_CHANNEL = `${CHANNEL_PREFIX}job:`;
const USER_CHANNEL = `${CHANNEL_PREFIX}user:`;

export class RedisAdapter {
  private publisher: Redis;
  private subscriber: Redis;
  private io: SocketIOServer;
  private isConnected = false;

  constructor(
    io: SocketIOServer,
    redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {
    this.io = io;
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.setupSubscriber();
  }

  /**
   * Setup subscriber to listen for messages on all channels
   */
  private setupSubscriber(): void {
    this.subscriber.on('connect', () => {
      console.log('[RedisAdapter] Connected to Redis');
      this.isConnected = true;
    });

    this.subscriber.on('disconnect', () => {
      console.log('[RedisAdapter] Disconnected from Redis');
      this.isConnected = false;
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const event = JSON.parse(message) as RealtimeEvent;
        this.routeEvent(channel, event);
      } catch (error) {
        console.error('[RedisAdapter] Failed to parse message:', error);
      }
    });

    // Subscribe to all job and user channels
    this.subscriber.psubscribe(`${JOB_CHANNEL}*`, `${USER_CHANNEL}*`, err => {
      if (err) {
        console.error('[RedisAdapter] Failed to subscribe:', err);
      }
    });
  }

  /**
   * Route event to appropriate Socket.IO room
   */
  private routeEvent(channel: string, event: RealtimeEvent): void {
    // Extract jobId or userId from channel
    if (channel.startsWith(JOB_CHANNEL)) {
      const jobId = channel.replace(JOB_CHANNEL, '');
      const room = `job:${jobId}`;
      this.io.to(room).emit('job:event', event);
    } else if (channel.startsWith(USER_CHANNEL)) {
      const userId = channel.replace(USER_CHANNEL, '');
      const room = `user:${userId}`;
      this.io.to(room).emit('user:event', event);
    }
  }

  /**
   * Publish job event to Redis
   */
  async publishJobEvent(jobId: string, event: RealtimeEvent): Promise<void> {
    if (!this.isConnected) {
      console.warn('[RedisAdapter] Redis not connected, buffering event');
    }
    await this.publisher.publish(`${JOB_CHANNEL}${jobId}`, JSON.stringify(event));
  }

  /**
   * Publish user event to Redis
   */
  async publishUserEvent(userId: string, event: RealtimeEvent): Promise<void> {
    if (!this.isConnected) {
      console.warn('[RedisAdapter] Redis not connected, buffering event');
    }
    await this.publisher.publish(`${USER_CHANNEL}${userId}`, JSON.stringify(event));
  }

  /**
   * Check connection status
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
    this.isConnected = false;
  }
}

/**
 * Singleton instance
 */
let adapter: RedisAdapter | null = null;

export function getRedisAdapter(io: SocketIOServer): RedisAdapter {
  if (!adapter) {
    adapter = new RedisAdapter(io);
  }
  return adapter;
}
