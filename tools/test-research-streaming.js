#!/usr/bin/env node
/**
 * End-to-end test script for research streaming
 * Tests: API → Queue → Worker → Pub/Sub → WebSocket → Client
 */

import WebSocket from 'ws';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/agent/stream';

async function testResearchStreaming() {
  console.log('[Test] Starting research streaming E2E test...\n');

  // Step 1: Start research job
  console.log('[Test] Step 1: Starting research job...');
  let jobId;
  try {
    const response = await fetch(`${API_BASE}/api/research/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is quantum computing?',
        lang: 'en',
        clientId: `test-client-${Date.now()}`,
        sessionId: `test-session-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    jobId = data.jobId;
    console.log(`[Test] ✓ Job started: ${jobId}\n`);
  } catch (error) {
    console.error(`[Test] ✗ Failed to start job: ${error.message}`);
    console.error('\nTroubleshooting:');
    console.error('  1. Is the server running? (npm run dev:server)');
    console.error('  2. Is the API endpoint correct? Check API_BASE_URL');
    process.exit(1);
  }

  // Step 2: Connect WebSocket
  console.log('[Test] Step 2: Connecting WebSocket...');
  const clientId = `test-client-${Date.now()}`;
  const wsUrl = `${WS_URL}?clientId=${clientId}&sessionId=test-session`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const events = [];
    let subscribed = false;

    const timeout = setTimeout(() => {
      ws.close();
      console.error('\n[Test] ✗ Timeout waiting for events');
      console.error(`[Test] Received ${events.length} events`);
      if (events.length === 0) {
        console.error('\nTroubleshooting:');
        console.error('  1. Is WebSocket server running? Check server logs');
        console.error('  2. Is Redis running? (docker run -d -p 6379:6379 redis:7)');
        console.error('  3. Is research worker running? (npm run worker:research)');
        console.error('  4. Check jobId matches:', jobId);
      }
      reject(new Error('Timeout'));
    }, 30000); // 30 second timeout

    ws.on('open', () => {
      console.log('[Test] ✓ WebSocket connected');
      console.log(`[Test] Subscribing to jobId: ${jobId}`);
      ws.send(JSON.stringify({ type: 'subscribe', jobId }));
    });

    ws.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'subscribed' && msg.jobId === jobId) {
          subscribed = true;
          console.log('[Test] ✓ Subscribed to job');
          return;
        }

        if (msg.type === 'research.event' && msg.jobId === jobId) {
          events.push(msg);
          const eventType = msg.eventType || msg.type;
          console.log(`[Test] ✓ Event received: ${eventType}`);

          if (eventType === 'chunk' && msg.data?.token) {
            process.stdout.write(msg.data.token);
          }

          if (eventType === 'done') {
            clearTimeout(timeout);
            ws.close();
            console.log('\n\n[Test] ✓ Test complete!');
            console.log(`[Test] Total events received: ${events.length}`);
            console.log(
              `[Test] Event types: ${[...new Set(events.map(e => e.eventType))].join(', ')}`
            );

            if (msg.data?.answer) {
              console.log(`[Test] Final answer length: ${msg.data.answer.length} chars`);
            }

            resolve({
              jobId,
              events,
              success: true,
            });
          }
        }
      } catch (error) {
        console.error('[Test] Failed to parse message:', error);
      }
    });

    ws.on('error', error => {
      clearTimeout(timeout);
      console.error(`[Test] ✗ WebSocket error: ${error.message}`);
      console.error('\nTroubleshooting:');
      console.error('  1. Is WebSocket server running?');
      console.error('  2. Check WS_URL:', WS_URL);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      if (!subscribed) {
        clearTimeout(timeout);
        console.error(`[Test] ✗ WebSocket closed before subscription (code: ${code})`);
        reject(new Error(`WebSocket closed: ${code} ${reason}`));
      }
    });
  });
}

// Run test
testResearchStreaming()
  .then(_result => {
    console.log('\n[Test] ✓ All checks passed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n[Test] ✗ Test failed:', error.message);
    process.exit(1);
  });
