/**
 * Simple Realtime Server Test
 * Tests Socket.IO connection and basic job flow without k6
 */

import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate test JWT
const token = jwt.sign({ userId: 'test-user-123' }, JWT_SECRET, { expiresIn: '1h' });

console.log('[Test] Connecting to realtime server:', SERVER_URL);
console.log('[Test] Using JWT token:', token.substring(0, 20) + '...');

// Create Socket.IO client
const socket = io(SERVER_URL, {
  auth: { token },
  transports: ['websocket'],
});

let testPassed = true;
let testsCompleted = 0;
const totalTests = 5;

function completeTest(passed, message) {
  testsCompleted++;
  if (!passed) {
    testPassed = false;
    console.error(`❌ ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }

  if (testsCompleted === totalTests) {
    console.log(`\n=== Test Summary ===`);
    console.log(`Overall: ${testPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    socket.disconnect();
    process.exit(testPassed ? 0 : 1);
  }
}

// Test 1: Connection
socket.on('connect', () => {
  completeTest(true, 'Test 1: Connected to realtime server');

  // Test 2: Emit test event
  socket.emit('test:ping', { timestamp: Date.now() });
});

socket.on('connect_error', error => {
  completeTest(false, `Test 1: Connection failed - ${error.message}`);
});

// Test 3: Server acknowledgment
socket.on('connected', () => {
  completeTest(true, 'Test 3: Received server acknowledgment');
});

// Test 4: Room join (if implemented)
socket.on('room:joined', data => {
  completeTest(true, `Test 4: Joined room - ${data.room}`);
});

// Test 5: Pong response
socket.on('test:pong', data => {
  completeTest(true, `Test 5: Received pong response - latency ${Date.now() - data.timestamp}ms`);
});

// Timeout fallback (30 seconds)
setTimeout(() => {
  if (testsCompleted < totalTests) {
    console.error(`\n⚠️ Timeout: Only ${testsCompleted}/${totalTests} tests completed`);
    
    // Mark remaining tests as incomplete
    while (testsCompleted < totalTests) {
      completeTest(false, `Test ${testsCompleted + 1}: Timeout`);
    }
  }
}, 30000);

// Handle errors
socket.on('error', error => {
  console.error('[Test] Socket error:', error);
});

socket.on('disconnect', reason => {
  console.log('[Test] Disconnected:', reason);
});
