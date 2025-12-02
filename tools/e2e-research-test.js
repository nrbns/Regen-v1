#!/usr/bin/env node
/**
 * End-to-End Research Streaming Diagnostic Test
 * Tests: Redis → API enqueue → WS forwarder subscription → Redis pub/sub forwarding → WS client receives
 *
 * Run with: node tools/e2e-research-test.js
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import IORedis from 'ioredis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const API_BASE = process.env.API_BASE_URL || process.env.API_BASE || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/agent/stream';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
// const TEST_JOB_PREFIX = 'E2E_TEST_JOB_'; // Reserved for future use

(async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('E2E Research Streaming Diagnostic Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1) Check Redis
  console.log('[STEP 1] Checking Redis connectivity...');
  try {
    const r = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    r.on('error', () => {
      // Suppress connection errors during test
    });

    const pong = await r.ping();
    if (pong !== 'PONG') throw new Error('Redis PING != PONG');
    console.log('[OK] Redis reachable at', REDIS_URL);
    r.disconnect();
  } catch (e) {
    console.error('[FAIL] Redis not reachable at', REDIS_URL);
    console.error('Error:', e.message);
    console.error('\nTo start Redis:');
    console.error('  docker run -d --name regen-redis -p 6379:6379 redis:7');
    console.error('  or: redis-server');
    process.exit(2);
  }

  // 2) Call Enqueue endpoint
  console.log('\n[STEP 2] Calling enqueue endpoint...');
  let jobId;
  try {
    const body = {
      query: 'E2E test: Compare X vs Y',
      lang: 'en',
      clientId: `e2e-test-${Date.now()}`,
      sessionId: `e2e-session-${Date.now()}`,
    };
    console.log('  URL:', API_BASE + '/api/research/run');
    console.log('  Body:', JSON.stringify(body, null, 2));

    const res = await fetch(API_BASE + '/api/research/run', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();
    console.log('  Response:', JSON.stringify(json, null, 2));

    if (!json.jobId) {
      throw new Error('No jobId in response: ' + JSON.stringify(json));
    }

    jobId = json.jobId;
    console.log('[OK] Enqueue returned jobId =', jobId);
  } catch (e) {
    console.error('[FAIL] Enqueue failed.');
    console.error('Error:', e && e.message ? e.message : e);
    console.error('\nTroubleshooting:');
    console.error('  1. Is the server running? (npm run dev:server)');
    console.error('  2. Is the route /api/research/run mounted?');
    console.error('  3. Check server logs for errors');
    process.exit(3);
  }

  // 3) Open WS client and subscribe to jobId
  console.log('\n[STEP 3] Connecting WebSocket...');
  let ws;
  let wsOpen = false;
  let gotSubscribedAck = false;
  let gotForwardedMsg = false;
  const clientId = `e2e-client-${Date.now()}`;
  const sessionId = `e2e-session-${Date.now()}`;
  const wsUrlWithParams = `${WS_URL}?clientId=${clientId}&sessionId=${sessionId}`;

  try {
    console.log('  Connecting to:', wsUrlWithParams);
    ws = new WebSocket(wsUrlWithParams);
  } catch (e) {
    console.error('[FAIL] Could not create WebSocket client to', WS_URL);
    console.error('Error:', e.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Is WebSocket server running?');
    console.error('  2. Check WS_URL:', WS_URL);
    console.error('  3. Verify server has attachWSServer called');
    process.exit(4);
  }

  ws.on('open', () => {
    wsOpen = true;
    console.log('[OK] WebSocket connected');
    const subscribeMsg = { type: 'subscribe', jobId };
    console.log('  Sending subscribe message:', JSON.stringify(subscribeMsg));
    ws.send(JSON.stringify(subscribeMsg));
  });

  ws.on('message', m => {
    try {
      const msg = JSON.parse(m.toString());
      console.log('  [WS RECV]', JSON.stringify(msg, null, 2));

      if (msg.type === 'subscribed' && msg.jobId === jobId) {
        gotSubscribedAck = true;
        console.log('[OK] Server acknowledged subscription for jobId:', jobId);
      }

      // If a worker/redis event is forwarded we will see it here
      if (
        msg.jobId === jobId &&
        (msg.type === 'research.event' || msg.type === 'llm.chunk') &&
        msg.data?.token &&
        msg.data.token.startsWith('TEST_TOKEN')
      ) {
        gotForwardedMsg = true;
        console.log('[OK] Received forwarded event for jobId:', jobId);
      }
    } catch (e) {
      console.warn('  [WARN] Error parsing WS message:', e.message);
    }
  });

  ws.on('error', e => {
    console.error('[FAIL] WebSocket error:', e.message);
  });

  ws.on('close', (code, reason) => {
    console.log('  WebSocket closed:', code, reason?.toString());
  });

  // Wait for WS to open and subscribe ack (timeout 6s)
  console.log('  Waiting for WebSocket to open and subscribe...');
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (wsOpen && gotSubscribedAck) break;
  }

  if (!wsOpen) {
    console.error('[FAIL] WebSocket did not open within 6 seconds');
    console.error('\nTroubleshooting:');
    console.error('  1. Check server attachWSServer was called');
    console.error('  2. Verify path matches:', WS_URL);
    console.error('  3. Check server logs for WebSocket errors');
    ws.close();
    process.exit(5);
  }

  if (!gotSubscribedAck) {
    console.error('[FAIL] Did not receive subscription acknowledgment');
    console.error('\nTroubleshooting:');
    console.error('  1. Check server handles subscribe messages');
    console.error('  2. Verify jobId matches:', jobId);
    console.error('  3. Check server logs for subscription handling');
    ws.close();
    process.exit(5);
  }

  // 4) Publish test message into Redis channel `research.event` (simulate worker)
  console.log('\n[STEP 4] Publishing test message to Redis...');
  try {
    const r = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    r.on('error', () => {
      // Suppress errors
    });

    const testMsg = {
      id: `test-${Date.now()}`,
      jobId,
      type: 'research.event',
      eventType: 'llm.chunk',
      seq: 1,
      data: {
        token: `TEST_TOKEN_${Date.now()}`,
        index: 1,
      },
      timestamp: Date.now(),
    };
    console.log('  Publishing to channel: research.event');
    console.log('  Message:', JSON.stringify(testMsg, null, 2));

    const subscribers = await r.publish('research.event', JSON.stringify(testMsg));
    console.log(`  Published (${subscribers} subscribers)`);
    r.disconnect();
  } catch (e) {
    console.error('[FAIL] Could not publish test message to Redis');
    console.error('Error:', e.message);
    ws.close();
    process.exit(6);
  }

  // Wait up to 6s for forwarded message
  console.log('\n[STEP 5] Waiting for forwarded message (6s timeout)...');
  const start = Date.now();
  while (Date.now() - start < 6000) {
    if (gotForwardedMsg) break;
    await new Promise(r => setTimeout(r, 200));
  }

  if (gotForwardedMsg) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('>>> E2E TEST PASS: WS client received forwarded Redis event');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nAll layers working correctly:');
    console.log('  ✓ Redis connectivity');
    console.log('  ✓ API enqueue endpoint');
    console.log('  ✓ WebSocket connection');
    console.log('  ✓ Job subscription');
    console.log('  ✓ Redis pub/sub forwarding');
    console.log('  ✓ WebSocket message delivery');
    ws.close();
    process.exit(0);
  }

  // Not received; print diagnostics
  console.error('\n═══════════════════════════════════════════════════════════');
  console.error('>>> E2E TEST FAILED: WS client did NOT receive forwarded event');
  console.error('═══════════════════════════════════════════════════════════\n');
  console.error('Diagnostics:');
  console.error('  Redis URL:', REDIS_URL);
  console.error('  API base:', API_BASE);
  console.error('  WS URL:', WS_URL);
  console.error('  jobId:', jobId);
  console.error('  wsOpen:', wsOpen);
  console.error('  gotSubscribedAck:', gotSubscribedAck);
  console.error('  gotForwardedMsg:', gotForwardedMsg);
  console.error('\nCommon causes:');
  console.error('  1. Worker publishing to different Redis instance');
  console.error('  2. WS forwarder not subscribed to research.event channel');
  console.error('  3. jobId mismatch (worker using job.id vs job.data.jobId)');
  console.error('  4. Reverse-proxy blocking WS upgrade');
  console.error('  5. WebSocket server not forwarding events to subscribed clients');
  console.error('\nNext steps:');
  console.error('  1. Check server logs for [WS-FORWARDER] messages');
  console.error('  2. Check worker logs for [ResearchWorker] Publishing event');
  console.error('  3. Verify jobClients map has entry for jobId:', jobId);
  console.error('  4. Run: redis-cli SUBSCRIBE research.event (should see test message)');

  ws.close();
  process.exit(10);
})();
