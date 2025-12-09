#!/usr/bin/env node
/**
 * Test Research Flow - End-to-End Test
 * Tests the complete research pipeline: API → Queue → Worker → WebSocket
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
config({ path: resolve(__dirname, '../.env') });

const API_URL = process.env.VITE_API_URL || 'http://127.0.0.1:4000';
const WS_URL = process.env.VITE_WS_HOST || 'ws://127.0.0.1:4000';

async function testResearchFlow() {
  console.log('🧪 Testing Research Flow...\n');

  // Step 1: Start research job
  console.log('1️⃣ Starting research job...');
  const clientId = `test-client-${Date.now()}`;
  const sessionId = `test-session-${Date.now()}`;

  try {
    const response = await fetch(`${API_URL}/api/research/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is artificial intelligence?',
        lang: 'auto',
        clientId,
        sessionId,
        options: {
          maxSources: 3,
          model: 'llama3.1',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const { jobId } = data;

    if (!jobId) {
      throw new Error('No jobId returned from API');
    }

    console.log(`✅ Research job started: ${jobId}\n`);

    // Step 2: Connect to WebSocket
    console.log('2️⃣ Connecting to WebSocket...');
    const wsUrl = `${WS_URL}/agent/stream?clientId=${clientId}&sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected\n');
        resolve();
      });

      ws.on('error', reject);

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });

    // Step 3: Subscribe to job
    console.log('3️⃣ Subscribing to job events...');
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        jobId,
      })
    );

    // Step 4: Listen for events
    console.log('4️⃣ Listening for events...\n');
    let eventCount = 0;
    const events = [];

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout waiting for events'));
      }, 60000); // 60 second timeout

      ws.on('message', raw => {
        try {
          const msg = JSON.parse(raw.toString());
          eventCount++;

          if (msg.type === 'subscribed') {
            console.log(`✅ Subscribed to job: ${msg.jobId}\n`);
            return;
          }

          if (msg.type === 'research.event') {
            const eventType = msg.eventType || msg.data?.type || 'unknown';
            events.push(eventType);

            console.log(`📨 Event #${eventCount}: ${eventType}`);

            if (eventType === 'sources' && msg.data?.sources) {
              console.log(`   Found ${msg.data.sources.length} sources`);
            }

            if (eventType === 'chunk' && msg.data?.token) {
              process.stdout.write(msg.data.token);
            }

            if (eventType === 'done') {
              console.log('\n\n✅ Research complete!');
              clearTimeout(timeout);
              ws.close();
              resolve();
            }

            if (eventType === 'error') {
              console.error(`\n❌ Error: ${msg.data?.error || 'Unknown error'}`);
              clearTimeout(timeout);
              ws.close();
              reject(new Error(msg.data?.error || 'Research failed'));
            }
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      ws.on('error', error => {
        clearTimeout(timeout);
        reject(error);
      });

      ws.on('close', () => {
        if (eventCount === 0) {
          clearTimeout(timeout);
          reject(new Error('WebSocket closed before receiving events'));
        }
      });
    });

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total events: ${eventCount}`);
    console.log(`   Event types: ${events.join(', ')}`);
    console.log('\n✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testResearchFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});







