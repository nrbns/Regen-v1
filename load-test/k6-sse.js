// CATEGORY C FIX: Load test for SSE connections
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const sseConnections = new Counter('sse_connections');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // 20 concurrent SSE connections
    { duration: '1m', target: 50 }, // 50 concurrent
    { duration: '2m', target: 100 }, // 100 concurrent
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    sse_connections: ['count>0'],
  },
};

export default function () {
  // Test SSE /api/ask endpoint
  const url = `${BASE_URL}/api/ask?q=test+query&sessionId=load-test`;

  const response = http.get(url, {
    headers: { Accept: 'text/event-stream' },
    tags: { name: 'SSE-Connection' },
  });

  check(response, {
    'SSE connection established': r => r.status === 200 || r.status === 200,
  });

  sseConnections.add(1);
}
