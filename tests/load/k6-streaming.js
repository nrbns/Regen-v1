/**
 * PR7: k6 Load Test - Streaming Jobs
 * 
 * Tests:
 * - Concurrent streaming jobs (200 VUs)
 * - Measure p95 latency for MODEL_CHUNK events
 * - Memory usage tracking
 * - Job cancellation under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const chunkLatency = new Trend('model_chunk_latency', true);
const jobSuccessRate = new Rate('job_success_rate');
const memoryUsage = new Trend('memory_usage_mb');

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
const SOCKET_URL = __ENV.SOCKET_URL || 'http://localhost:4000';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users (target load)
    { duration: '2m', target: 200 },   // Stay at 200 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // p95 latency < 500ms
    'model_chunk_latency': ['p(95)<100'], // p95 chunk latency < 100ms
    'job_success_rate': ['rate>0.95'],    // 95% success rate
  },
};

/**
 * Simulate WebSocket connection and streaming (using HTTP polling as fallback)
 * In production, use k6 WebSocket support if available
 */
function simulateStreamingJob(vuId) {
  const jobId = `load-test-job-${vuId}-${Date.now()}`;
  const userId = `load-test-user-${vuId}`;

  // Start job
  const startResponse = http.post(
    `${BASE_URL}/api/job/start`,
    JSON.stringify({
      jobId,
      userId,
      jobType: 'llm',
      query: 'What is artificial intelligence?',
      stream: true,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${userId}`,
      },
      tags: { name: 'start_job' },
    }
  );

  const startSuccess = check(startResponse, {
    'job started': (r) => r.status === 200 || r.status === 201,
  });

  if (!startSuccess) {
    jobSuccessRate.add(0);
    return;
  }

  let chunkCount = 0;
  let lastChunkTime = Date.now();
  const maxChunks = 50; // Limit chunks per job
  const timeout = 30000; // 30 second timeout

  // Poll for chunks (simulating WebSocket streaming)
  const startTime = Date.now();
  while (chunkCount < maxChunks && (Date.now() - startTime) < timeout) {
    const chunkResponse = http.get(
      `${BASE_URL}/api/job/${jobId}/chunk?lastSequence=${chunkCount}`,
      {
        headers: {
          'Authorization': `Bearer test-token-${userId}`,
        },
        tags: { name: 'get_chunk' },
      }
    );

    if (chunkResponse.status === 200) {
      const chunkData = JSON.parse(chunkResponse.body);
      
      if (chunkData.chunk) {
        const chunkLatencyMs = Date.now() - lastChunkTime;
        chunkLatency.add(chunkLatencyMs);
        chunkCount++;
        lastChunkTime = Date.now();
      }

      if (chunkData.complete) {
        // Job completed
        break;
      }
    } else if (chunkResponse.status === 404) {
      // Job not found or not ready yet
      sleep(0.1);
      continue;
    } else {
      // Error
      break;
    }

    sleep(0.05); // Poll every 50ms
  }

  // Verify job completion
  const statusResponse = http.get(
    `${BASE_URL}/api/job/${jobId}/status`,
    {
      headers: {
        'Authorization': `Bearer test-token-${userId}`,
      },
      tags: { name: 'get_status' },
    }
  );

  const jobComplete = check(statusResponse, {
    'job completed': (r) => {
      if (r.status === 200) {
        const status = JSON.parse(r.body);
        return status.status === 'completed' || status.status === 'success';
      }
      return false;
    },
  });

  jobSuccessRate.add(jobComplete ? 1 : 0);

  // Calculate total job duration
  const jobDuration = Date.now() - startTime;
  return {
    jobId,
    chunks: chunkCount,
    duration: jobDuration,
    success: jobComplete,
  };
}

/**
 * Test job cancellation under load
 */
function testJobCancellation(vuId) {
  const jobId = `cancel-test-job-${vuId}-${Date.now()}`;
  const userId = `cancel-test-user-${vuId}`;

  // Start job
  http.post(
    `${BASE_URL}/api/job/start`,
    JSON.stringify({
      jobId,
      userId,
      jobType: 'llm',
      query: 'Tell me a very long story',
      stream: true,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${userId}`,
      },
    }
  );

  sleep(1); // Wait for job to start

  // Cancel job
  const cancelResponse = http.post(
    `${BASE_URL}/api/job/${jobId}/cancel`,
    JSON.stringify({ jobId }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${userId}`,
      },
      tags: { name: 'cancel_job' },
    }
  );

  check(cancelResponse, {
    'cancel accepted': (r) => r.status === 200 || r.status === 202,
  });

  sleep(2); // Wait for cancellation to process

  // Verify job is cancelled
  const statusResponse = http.get(
    `${BASE_URL}/api/job/${jobId}/status`,
    {
      headers: {
        'Authorization': `Bearer test-token-${userId}`,
      },
    }
  );

  check(statusResponse, {
    'job cancelled': (r) => {
      if (r.status === 200) {
        const status = JSON.parse(r.body);
        return status.status === 'cancelled';
      }
      return false;
    },
  });
}

export default function () {
  const vuId = __VU;

  // 80% of VUs run streaming jobs
  if (vuId % 10 < 8) {
    const result = simulateStreamingJob(vuId);
    
    // Log if job failed
    if (!result.success) {
      console.log(`Job ${result.jobId} failed`);
    }
  } else {
    // 20% test cancellation
    testJobCancellation(vuId);
  }

  // Small sleep between iterations
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

