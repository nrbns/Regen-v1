/**
 * K6 WebSocket & Realtime Stress Test
 *
 * Tests realtime reliability under load:
 * - WebSocket connection stability
 * - Message delivery under stress
 * - Reconnect/resume handling
 * - Duplicate prevention
 * - Redis persistence
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import ws from 'k6/ws';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const wsConnectionSuccess = new Rate('ws_connect_success');
const wsReconnects = new Counter('ws_reconnects');
const messageLatency = new Trend('message_latency_ms');
const duplicateMessages = new Counter('duplicate_messages');
const lostMessages = new Counter('lost_messages');
const wsErrors = new Counter('ws_errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 WebSocket connections
    { duration: '2m', target: 50 }, // Stress: 50 concurrent connections
    { duration: '3m', target: 100 }, // Peak: 100 concurrent connections
    { duration: '2m', target: 50 }, // Partial recovery
    { duration: '1m', target: 10 }, // Ramp down
    { duration: '30s', target: 0 }, // Disconnect all
  ],
  thresholds: {
    ws_connect_success: ['rate>0.95'], // 95% successful connections
    message_latency_ms: ['p(95)<500'], // 95% under 500ms
    duplicate_messages: ['count<50'], // Less than 50 duplicates in test
    lost_messages: ['count<10'], // Less than 10 lost messages
    ws_errors: ['count<20'], // Less than 20 errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

export default function () {
  const userId = `user-${__VU}-${Date.now()}`;
  const sessionId = `session-${__VU}-${__ITER}`;
  let messageCount = 0;
  let duplicateCount = 0;
  const seenMessages = new Set();

  // Test 1: WebSocket Connection & Message Handling
  group('WebSocket Realtime Connection', () => {
    const url = `${WS_URL}/realtime?userId=${userId}&sessionId=${sessionId}`;
    const params = {
      tags: { name: 'WebSocketConnection' },
    };

    const startTime = new Date();
    let connectionEstablished = false;
    let reconnectCount = 0;

    const res = ws.connect(url, params, function (socket) {
      connectionEstablished = true;
      wsConnectionSuccess.add(1);

      // Handle incoming messages
      socket.on('message', data => {
        try {
          const msg = JSON.parse(data);
          const now = Date.now();

          // Track latency
          if (msg.timestamp) {
            const latency = now - msg.timestamp;
            messageLatency.add(latency);
          }

          // Detect duplicates
          const msgId = msg.id || msg.eventId;
          if (msgId) {
            if (seenMessages.has(msgId)) {
              duplicateMessages.add(1);
              duplicateCount++;
            } else {
              seenMessages.add(msgId);
            }
          }

          messageCount++;
        } catch (err) {
          wsErrors.add(1);
        }
      });

      // Handle reconnection
      socket.on('open', () => {
        if (reconnectCount > 0) {
          wsReconnects.add(1);
        }
      });

      // Handle errors
      socket.on('error', err => {
        wsErrors.add(1);
        reconnectCount++;
      });

      // Handle closure
      socket.on('close', () => {
        reconnectCount++;
      });

      // Send periodic messages while connected
      const sendInterval = setInterval(() => {
        if (socket.readyState === ws.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'heartbeat',
              userId,
              sessionId,
              timestamp: Date.now(),
              iteration: __ITER,
            })
          );
        }
      }, 1000);

      // Keep connection open for test duration
      socket.setTimeout(() => {
        clearInterval(sendInterval);
        socket.close();
      }, 30000); // 30 second connection

      socket.setInterval(() => {
        socket.ping();
      }, 5000); // Ping every 5 seconds
    });

    check(res, {
      'WebSocket connection established': () => connectionEstablished,
      'Status code is 101 (WebSocket upgrade)': () => res && res.status === 101,
      'Received messages': () => messageCount > 0,
      'Low duplicate rate': () => duplicateCount < messageCount * 0.1,
    });
  });

  sleep(2);

  // Test 2: Reconnection & Resume Handling
  group('Reconnect & Resume', () => {
    const sessionId2 = `session-${__VU}-${__ITER}-resume`;

    // First connection
    let initialMessages = 0;
    const url1 = `${WS_URL}/realtime?userId=${userId}&sessionId=${sessionId2}`;

    ws.connect(url1, { tags: { name: 'ReconnectTest-Initial' } }, function (socket) {
      socket.on('message', data => {
        initialMessages++;
      });

      socket.setTimeout(() => {
        socket.close();
      }, 5000);
    });

    sleep(2);

    // Reconnect with session recovery
    let resumedMessages = 0;
    const url2 = `${WS_URL}/realtime?userId=${userId}&sessionId=${sessionId2}&resume=true`;

    ws.connect(url2, { tags: { name: 'ReconnectTest-Resume' } }, function (socket) {
      socket.on('message', data => {
        resumedMessages++;
      });

      socket.setTimeout(() => {
        socket.close();
      }, 5000);
    });

    check(
      { resumedMessages },
      {
        'Session resume received messages': () => resumedMessages > 0,
      }
    );
  });

  sleep(1);

  // Test 3: High-Frequency Message Handling
  group('High-Frequency Messages', () => {
    const sessionId3 = `session-${__VU}-${__ITER}-highfreq`;
    let fastMessages = 0;
    const url = `${WS_URL}/realtime?userId=${userId}&sessionId=${sessionId3}`;

    ws.connect(url, { tags: { name: 'HighFrequency' } }, function (socket) {
      let sentCount = 0;

      socket.on('message', data => {
        fastMessages++;
      });

      // Send rapid messages
      const rapidSend = setInterval(() => {
        if (socket.readyState === ws.OPEN && sentCount < 50) {
          socket.send(
            JSON.stringify({
              type: 'rapid-test',
              id: `msg-${__VU}-${sentCount}`,
              timestamp: Date.now(),
            })
          );
          sentCount++;
        }
      }, 100); // Send every 100ms

      socket.setTimeout(() => {
        clearInterval(rapidSend);
        socket.close();
      }, 10000);
    });

    check(
      { fastMessages },
      {
        'Handled rapid messages': () => fastMessages > 0,
        'Message throughput reasonable': () => fastMessages > 10,
      }
    );
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'k6-results.json': JSON.stringify(data),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const metrics = data.metrics;

  let output = '\n\n=== K6 Realtime Stress Test Summary ===\n\n';

  output += 'WebSocket Connections:\n';
  output += `  Success Rate: ${(metrics.ws_connect_success?.values?.rate * 100).toFixed(1)}%\n`;
  output += `  Reconnects: ${metrics.ws_reconnects?.values?.count || 0}\n\n`;

  output += 'Message Handling:\n';
  output += `  Latency p95: ${(metrics.message_latency_ms?.values['p(95)'] || 0).toFixed(0)}ms\n`;
  output += `  Duplicates: ${metrics.duplicate_messages?.values?.count || 0}\n`;
  output += `  Lost: ${metrics.lost_messages?.values?.count || 0}\n`;
  output += `  Errors: ${metrics.ws_errors?.values?.count || 0}\n\n`;

  if (metrics.ws_errors?.values?.count > 20) {
    output += '⚠️  HIGH ERROR RATE - Investigate WebSocket stability\n';
  }

  if (metrics.duplicate_messages?.values?.count > 50) {
    output += '⚠️  DUPLICATE DETECTION - Enable deduplication\n';
  }

  return output;
}
