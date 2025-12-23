/**
 * k6 Load Test for Regen Browser
 * Tests: WebSocket connections, tab operations, voice commands, research queries
 *
 * Run: k6 run tests/load/k6-load-test.js
 *
 * Scenarios:
 * - 100 concurrent WebSocket connections
 * - 500 concurrent tab operations
 * - 200 concurrent voice commands
 * - 100 concurrent research queries
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';
import { Rate } from 'k6/metrics';

// Custom metrics
const wsConnectionSuccessRate = new Rate('ws_connection_success');
const tabOperationSuccessRate = new Rate('tab_operation_success');
const voiceCommandSuccessRate = new Rate('voice_command_success');
const researchQuerySuccessRate = new Rate('research_query_success');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '2m', target: 500 }, // Ramp up to 500 users (peak load)
    { duration: '1m', target: 1000 }, // Peak: 1000 concurrent users
    { duration: '2m', target: 1000 }, // Sustain peak
    { duration: '1m', target: 500 }, // Ramp down
    { duration: '30s', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    ws_connection_success: ['rate>0.95'], // 95% success rate
    tab_operation_success: ['rate>0.95'],
    voice_command_success: ['rate>0.90'], // 90% success rate (voice can be flaky)
    research_query_success: ['rate>0.95'],
  },
};

// Base URL (adjust for your environment)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000';

// Test data
const voiceCommands = [
  'Research Bitcoin',
  'Show NIFTY chart',
  'Summarize this page',
  'Open YouTube',
  'Search for AI news',
];

const researchQueries = [
  'What is Bitcoin?',
  'Explain quantum computing',
  'Latest AI developments',
  'Stock market trends',
  'Climate change solutions',
];

/**
 * WebSocket connection test
 */
export function wsConnectionTest() {
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  const params = { tags: { name: 'WebSocket' } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      wsConnectionSuccessRate.add(1);
      console.log('WebSocket connected');
    });

    socket.on('message', data => {
      // Handle incoming messages
      const message = JSON.parse(data);
      if (message.type === 'pong') {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    });

    socket.on('error', e => {
      wsConnectionSuccessRate.add(0);
      console.error('WebSocket error:', e);
    });

    // Keep connection alive for 30 seconds
    sleep(30);

    socket.close();
  });

  check(res, {
    'WebSocket connection status is 101': r => r && r.status === 101,
  });
}

/**
 * Tab operation test (simulate via HTTP API)
 */
export function tabOperationTest() {
  const url = `${BASE_URL}/api/tabs`;
  const payload = JSON.stringify({
    url: 'https://example.com',
    title: 'Test Tab',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'TabOperation' },
  };

  const res = http.post(url, payload, params);

  const success = check(res, {
    'Tab operation status is 200 or 201': r => r.status === 200 || r.status === 201,
    'Tab operation response time < 2s': r => r.timings.duration < 2000,
  });

  tabOperationSuccessRate.add(success ? 1 : 0);

  sleep(1);
}

/**
 * Voice command test (simulate via HTTP API)
 */
export function voiceCommandTest() {
  const command = voiceCommands[Math.floor(Math.random() * voiceCommands.length)];
  const url = `${BASE_URL}/api/voice/command`;
  const payload = JSON.stringify({
    command,
    language: 'en',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'VoiceCommand' },
  };

  const res = http.post(url, payload, params);

  const success = check(res, {
    'Voice command status is 200': r => r.status === 200,
    'Voice command response time < 3s': r => r.timings.duration < 3000,
  });

  voiceCommandSuccessRate.add(success ? 1 : 0);

  sleep(2);
}

/**
 * Research query test (simulate via HTTP API)
 */
export function researchQueryTest() {
  const query = researchQueries[Math.floor(Math.random() * researchQueries.length)];
  const url = `${BASE_URL}/api/research/query`;
  const payload = JSON.stringify({
    query,
    language: 'en',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'ResearchQuery' },
  };

  const res = http.post(url, payload, params);

  const success = check(res, {
    'Research query status is 200': r => r.status === 200,
    'Research query response time < 5s': r => r.timings.duration < 5000,
  });

  researchQuerySuccessRate.add(success ? 1 : 0);

  sleep(3);
}

/**
 * Main test function
 * Distributes load across different test types
 */
export default function () {
  const testType = Math.random();

  if (testType < 0.25) {
    // 25% WebSocket connections
    wsConnectionTest();
  } else if (testType < 0.5) {
    // 25% Tab operations
    tabOperationTest();
  } else if (testType < 0.75) {
    // 25% Voice commands
    voiceCommandTest();
  } else {
    // 25% Research queries
    researchQueryTest();
  }
}

/**
 * Setup function (runs once before all VUs)
 */
export function setup() {
  console.log('Starting k6 load test for Regen Browser');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  return {};
}

/**
 * Teardown function (runs once after all VUs)
 */
export function teardown(data) {
  console.log('Load test completed');
}
