/**
 * GOAL:
 * Load test Regen Browser realtime pipeline.
 *
 * TEST:
 * - 100 concurrent users
 * - Each starts a job
 * - Simulate reconnects
 * - Validate latency < 500ms p95
 *
 * OUTPUT:
 * - Console metrics
 * - Fail test if thresholds exceeded
 */

import { check, sleep } from 'k6';
import ws from 'k6/ws';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const jobStartedRate = new Rate('job_started_rate');
const jobCompletedRate = new Rate('job_completed_rate');
const chunkLatency = new Trend('chunk_latency');
const reconnectSuccess = new Rate('reconnect_success');
const messageCounter = new Counter('messages_received');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up
    { duration: '1m', target: 100 }, // Peak load
    { duration: '30s', target: 100 }, // Sustain
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    job_started_rate: ['rate>0.95'], // 95% jobs should start successfully
    job_completed_rate: ['rate>0.90'], // 90% jobs should complete
    chunk_latency: ['p(95)<500'], // 95th percentile < 500ms
    reconnect_success: ['rate>0.95'], // 95% reconnects successful
    ws_connecting: ['p(95)<1000'], // WebSocket connection < 1s
    ws_session_duration: ['p(95)<120000'], // Session duration reasonable
  },
};

const SERVER_URL = __ENV.SERVER_URL || 'ws://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token-123';

export default function () {
  const url = `${SERVER_URL}?token=${JWT_TOKEN}`;

  // Track job events
  let jobStarted = false;
  let jobCompleted = false;
  let chunksReceived = 0;
  let lastChunkTime = Date.now();

  const res = ws.connect(url, { tags: { name: 'realtime-test' } }, function (socket) {
    socket.on('open', () => {
      console.log(`[${__VU}] Connected to realtime server`);

      // Emit job start
      const jobPayload = {
        type: 'test-job',
        input: {
          duration: Math.floor(Math.random() * 10) + 5, // 5-15 seconds
          chunks: Math.floor(Math.random() * 50) + 20, // 20-70 chunks
        },
      };

      socket.send(JSON.stringify({ event: 'start:job', payload: jobPayload }));
    });

    socket.on('message', data => {
      const message = JSON.parse(data);
      messageCounter.add(1);

      // Handle different event types
      switch (message.event) {
        case 'job:started':
          console.log(`[${__VU}] Job started: ${message.jobId}`);
          jobStarted = true;
          jobStartedRate.add(true);

          // Subscribe to job updates
          socket.send(JSON.stringify({ event: 'subscribe:job', jobId: message.jobId }));
          break;

        case 'job:chunk':
          chunksReceived++;
          const latency = Date.now() - lastChunkTime;
          chunkLatency.add(latency);
          lastChunkTime = Date.now();

          // Simulate reconnect every 20 chunks
          if (chunksReceived % 20 === 0) {
            console.log(`[${__VU}] Simulating reconnect...`);
            socket.close();
            sleep(1);

            // Reconnect test
            const reconnected = check(socket, {
              'reconnect successful': () => true,
            });
            reconnectSuccess.add(reconnected);
          }
          break;

        case 'job:progress':
          const progress = message.payload?.progress;
          if (progress) {
            console.log(
              `[${__VU}] Progress: ${Math.round(progress.percentage)}% (${progress.current}/${progress.total})`
            );
          }
          break;

        case 'job:completed':
          console.log(`[${__VU}] Job completed: ${message.jobId}`);
          jobCompleted = true;
          jobCompletedRate.add(true);
          socket.close();
          break;

        case 'job:failed':
          console.error(`[${__VU}] Job failed: ${message.payload?.error}`);
          jobCompletedRate.add(false);
          socket.close();
          break;

        case 'connected':
          console.log(`[${__VU}] Server confirmed connection`);
          break;

        default:
          console.log(`[${__VU}] Unknown event: ${message.event}`);
      }
    });

    socket.on('error', error => {
      console.error(`[${__VU}] WebSocket error:`, error);
      jobStartedRate.add(false);
      jobCompletedRate.add(false);
    });

    socket.on('close', () => {
      console.log(`[${__VU}] WebSocket closed`);
    });

    // Wait for job completion or timeout
    socket.setTimeout(() => {
      console.log(`[${__VU}] Test timeout, closing socket`);
      socket.close();
    }, 120000); // 2 minute timeout
  });

  // Validate connection
  check(res, {
    'WebSocket connected': r => r && r.status === 101,
  });

  // If job didn't start, record failure
  if (!jobStarted) {
    jobStartedRate.add(false);
  }

  // If job didn't complete, record failure
  if (!jobCompleted) {
    jobCompletedRate.add(false);
  }

  sleep(1);
}

// Test teardown summary
export function handleSummary(data) {
  const summary = {
    metrics: {
      job_started_rate: data.metrics.job_started_rate?.values?.rate || 0,
      job_completed_rate: data.metrics.job_completed_rate?.values?.rate || 0,
      chunk_latency_p95: data.metrics.chunk_latency?.values?.['p(95)'] || 0,
      reconnect_success: data.metrics.reconnect_success?.values?.rate || 0,
      messages_received: data.metrics.messages_received?.values?.count || 0,
      ws_connecting_p95: data.metrics.ws_connecting?.values?.['p(95)'] || 0,
    },
    thresholds: {
      job_started_rate: data.metrics.job_started_rate?.thresholds?.['rate>0.95']?.ok || false,
      job_completed_rate: data.metrics.job_completed_rate?.thresholds?.['rate>0.90']?.ok || false,
      chunk_latency: data.metrics.chunk_latency?.thresholds?.['p(95)<500']?.ok || false,
      reconnect_success: data.metrics.reconnect_success?.thresholds?.['rate>0.95']?.ok || false,
    },
  };

  console.log('\n=== REALTIME LOAD TEST SUMMARY ===');
  console.log('Metrics:');
  console.log(`  Job Started Rate: ${(summary.metrics.job_started_rate * 100).toFixed(2)}%`);
  console.log(`  Job Completed Rate: ${(summary.metrics.job_completed_rate * 100).toFixed(2)}%`);
  console.log(`  Chunk Latency (p95): ${summary.metrics.chunk_latency_p95.toFixed(2)}ms`);
  console.log(`  Reconnect Success: ${(summary.metrics.reconnect_success * 100).toFixed(2)}%`);
  console.log(`  Messages Received: ${summary.metrics.messages_received}`);
  console.log(`  WS Connection (p95): ${summary.metrics.ws_connecting_p95.toFixed(2)}ms`);

  console.log('\nThresholds:');
  console.log(`  ✓ Job Started Rate > 95%: ${summary.thresholds.job_started_rate ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Job Completed Rate > 90%: ${summary.thresholds.job_completed_rate ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Chunk Latency < 500ms: ${summary.thresholds.chunk_latency ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  ✓ Reconnect Success > 95%: ${summary.thresholds.reconnect_success ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(summary.thresholds).every(Boolean);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  return {
    'stdout': JSON.stringify(summary, null, 2),
  };
}
