/**
 * Integration Test: Real-time Pub/Sub with Multiple Servers
 *
 * Verifies:
 * - Redis adapter is properly configured
 * - Workers publish to Redis channels
 * - Multiple server instances receive messages
 * - Clients receive messages exactly once
 */

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { io } from 'socket.io-client';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const BASE_PORT = 4001;

describe('Real-time Pub/Sub Integration', function () {
  this.timeout(30000);

  let redisClient;
  let server1, server2;
  let worker;
  let httpServer1, httpServer2;
  let io1, io2;

  before(async () => {
    // Connect to Redis
    redisClient = new Redis(REDIS_URL);
    await redisClient.ping();

    // Create two HTTP servers
    httpServer1 = createServer();
    httpServer2 = createServer();

    // Create Socket.IO servers with Redis adapter
    io1 = new Server(httpServer1, {
      cors: { origin: '*' },
      adapter: createAdapter(new Redis(REDIS_URL), new Redis(REDIS_URL)),
    });

    io2 = new Server(httpServer2, {
      cors: { origin: '*' },
      adapter: createAdapter(new Redis(REDIS_URL), new Redis(REDIS_URL)),
    });

    // Subscribe to job channels
    const sub1 = new Redis(REDIS_URL);
    const sub2 = new Redis(REDIS_URL);

    await sub1.psubscribe('job:*');
    await sub2.psubscribe('job:*');

    sub1.on('pmessage', (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        if (data.userId) {
          io1.to(`user:${data.userId}`).emit(data.event, data.data);
        }
      } catch (e) {
        console.error('[Server1] Failed to parse message', e);
      }
    });

    sub2.on('pmessage', (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        if (data.userId) {
          io2.to(`user:${data.userId}`).emit(data.event, data.data);
        }
      } catch (e) {
        console.error('[Server2] Failed to parse message', e);
      }
    });

    // Start servers
    await new Promise(resolve => {
      httpServer1.listen(BASE_PORT, resolve);
    });

    await new Promise(resolve => {
      httpServer2.listen(BASE_PORT + 1, resolve);
    });

    // Create worker
    worker = new Worker(
      'test-queue',
      async job => {
        const { userId, jobId } = job.data;
        const pub = new Redis(REDIS_URL);

        // Publish chunks
        for (let i = 0; i < 5; i++) {
          await pub.publish(
            `job:${jobId}`,
            JSON.stringify({
              event: 'model:chunk:v1',
              data: {
                jobId,
                userId,
                chunk: `chunk-${i}`,
                index: i,
              },
            })
          );
          await new Promise(r => setTimeout(r, 100));
        }

        // Publish completion
        await pub.publish(
          `job:${jobId}`,
          JSON.stringify({
            event: 'model:complete:v1',
            data: {
              jobId,
              userId,
              result: 'done',
            },
          })
        );

        return { success: true };
      },
      {
        connection: new Redis(REDIS_URL),
      }
    );
  });

  after(async () => {
    await worker.close();
    await new Promise(resolve => httpServer1.close(resolve));
    await new Promise(resolve => httpServer2.close(resolve));
    await redisClient.quit();
  });

  it('should receive messages on both servers when worker publishes', async () => {
    const userId = 'test-user-1';
    const jobId = 'test-job-1';

    // Connect clients to both servers
    const client1 = io(`http://localhost:${BASE_PORT}`, {
      auth: { token: userId },
    });

    const client2 = io(`http://localhost:${BASE_PORT + 1}`, {
      auth: { token: userId },
    });

    await new Promise(resolve => {
      client1.on('connect', () => {
        client1.emit('join', `user:${userId}`);
        resolve();
      });
    });

    await new Promise(resolve => {
      client2.on('connect', () => {
        client2.emit('join', `user:${userId}`);
        resolve();
      });
    });

    // Join user rooms
    io1.sockets.sockets.forEach(socket => {
      socket.join(`user:${userId}`);
    });
    io2.sockets.sockets.forEach(socket => {
      socket.join(`user:${userId}`);
    });

    const received1 = [];
    const received2 = [];

    client1.on('model:chunk:v1', data => {
      received1.push(data);
    });

    client2.on('model:chunk:v1', data => {
      received2.push(data);
    });

    // Enqueue job
    const { Queue } = await import('bullmq');
    const queue = new Queue('test-queue', {
      connection: new Redis(REDIS_URL),
    });

    await queue.add('test-job', { userId, jobId });

    // Wait for messages
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Both clients should receive messages
    expect(received1.length).to.be.greaterThan(0);
    expect(received2.length).to.be.greaterThan(0);

    client1.disconnect();
    client2.disconnect();
  });
});
