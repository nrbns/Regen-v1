// CATEGORY C FIX: Load test for summarize endpoint
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'], // Less than 1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  // Test summarize endpoint
  const payload = JSON.stringify({
    url: 'https://example.com',
    question: 'What is this page about?',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  };

  const res = http.post(`${BASE_URL}/api/summarize`, payload, params);

  check(res, {
    'status is 200 or 202': r => r.status === 200 || r.status === 202,
    'response time < 2s': r => r.timings.duration < 2000,
  });

  sleep(1);
}
