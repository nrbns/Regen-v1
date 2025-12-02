#!/usr/bin/env node
/**
 * End-to-End WebSocket Test
 * Subscribes to WS, publishes Redis message, verifies forwarding works
 * Usage: node tools/e2e-ws-test.js <jobId>
 */

import WebSocket from 'ws';
import IORedis from 'ioredis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const jobId = process.argv[2] || `E2E_JOB_${Date.now()}`;
const wsUrl = process.env.WS_URL || 'ws://localhost:3000/agent/stream';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const clientId = `e2e-test-${Date.now()}`;
const sessionId = `e2e-session-${Date.now()}`;

const wsUrlWithParams = `${wsUrl}?clientId=${clientId}&sessionId=${sessionId}`;

console.log('[E2E-WS-TEST] Starting test...');
console.log('  JobId:', jobId);
console.log('  WS URL:', wsUrlWithParams);
console.log('  Redis URL:', redisUrl);

const pub = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 5000,
});

pub.on('error', () => {
  // Suppress errors
});

const ws = new WebSocket(wsUrlWithParams);
let subscribed = false;
let received = false;

const timeout = setTimeout(() => {
  console.error('\n[E2E-WS-TEST] ✗ Timeout waiting for message');
  console.error('  subscribed:', subscribed);
  console.error('  received:', received);
  ws.close();
  pub.disconnect();
  process.exit(1);
}, 10000);

ws.on('open', () => {
  console.log('[E2E-WS-TEST] ✓ WebSocket connected');
  console.log('[E2E-WS-TEST] Subscribing to jobId:', jobId);
  ws.send(JSON.stringify({ type: 'subscribe', jobId }));
});

ws.on('message', m => {
  try {
    const msg = JSON.parse(m.toString());
    console.log('[E2E-WS-TEST] Received message:', JSON.stringify(msg, null, 2));

    if (msg.type === 'subscribed' && msg.jobId === jobId) {
      subscribed = true;
      console.log('[E2E-WS-TEST] ✓ Subscription confirmed');

      // Wait a moment, then publish test message
      setTimeout(async () => {
        try {
          console.log('[E2E-WS-TEST] Publishing test message via Redis...');
          const testMsg = {
            id: `e2e-test-${Date.now()}`,
            jobId,
            type: 'research.event',
            eventType: 'llm.chunk',
            seq: 1,
            data: {
              token: 'hello-e2e-test',
              index: 1,
            },
            timestamp: Date.now(),
          };

          await pub.publish('research.event', JSON.stringify(testMsg));
          console.log('[E2E-WS-TEST] ✓ Published to Redis');
        } catch (error) {
          console.error('[E2E-WS-TEST] ✗ Failed to publish:', error.message);
          clearTimeout(timeout);
          ws.close();
          pub.disconnect();
          process.exit(1);
        }
      }, 500);
    }

    // Check if we received the forwarded event
    if (
      msg.jobId === jobId &&
      (msg.type === 'research.event' || msg.eventType === 'llm.chunk') &&
      msg.data?.token === 'hello-e2e-test'
    ) {
      received = true;
      console.log('\n[E2E-WS-TEST] ✓✓✓ SUCCESS: Received forwarded event!');
      console.log('[E2E-WS-TEST] Full pipeline working: Redis → Server → WebSocket → Client');
      clearTimeout(timeout);
      ws.close();
      pub.disconnect();
      process.exit(0);
    }
  } catch (e) {
    console.error('[E2E-WS-TEST] Failed to parse message:', e.message);
  }
});

ws.on('error', e => {
  console.error('[E2E-WS-TEST] ✗ WebSocket error:', e.message);
  clearTimeout(timeout);
  pub.disconnect();
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('[E2E-WS-TEST] WebSocket closed:', code, reason?.toString());
  if (!received) {
    console.error('[E2E-WS-TEST] ✗ Test failed - did not receive forwarded message');
    clearTimeout(timeout);
    pub.disconnect();
    process.exit(1);
  }
});
