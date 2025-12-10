/**
 * Socket.IO Load Test
 * Simulates N concurrent socket connections
 *
 * Usage: node scripts/load-test-socket.js [connections] [duration]
 * Example: node scripts/load-test-socket.js 100 60
 */

const { io } = require('socket.io-client');

const CONNECTIONS = parseInt(process.argv[2]) || 100;
const DURATION = parseInt(process.argv[3]) || 60; // seconds
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

console.log(`🧪 Socket.IO Load Test`);
console.log(`   Connections: ${CONNECTIONS}`);
console.log(`   Duration: ${DURATION}s`);
console.log(`   URL: ${SOCKET_URL}`);
console.log('');

const clients = [];
let connected = 0;
let messagesReceived = 0;
let errors = 0;
const startTime = Date.now();

// Create connections
for (let i = 0; i < CONNECTIONS; i++) {
  const client = io(SOCKET_URL, {
    auth: { token: `test-token-${i}` },
    transports: ['websocket', 'polling'],
    reconnection: false,
  });

  client.on('connect', () => {
    connected++;
    if (connected % 10 === 0) {
      console.log(`   ✅ ${connected}/${CONNECTIONS} connected`);
    }
  });

  client.on('disconnect', () => {
    connected--;
  });

  client.on('error', error => {
    errors++;
    console.error(`   ❌ Error: ${error.message}`);
  });

  client.onAny((event, data) => {
    messagesReceived++;
  });

  // Send test message every 5 seconds
  setInterval(() => {
    if (client.connected) {
      client.emit('ping', { timestamp: Date.now() });
    }
  }, 5000);

  clients.push(client);
}

// Stats reporting
const statsInterval = setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  const msgRate = messagesReceived / elapsed;

  console.log(`📊 Stats (${elapsed.toFixed(1)}s):`);
  console.log(`   Connected: ${connected}/${CONNECTIONS}`);
  console.log(`   Messages: ${messagesReceived} (${msgRate.toFixed(1)}/s)`);
  console.log(`   Errors: ${errors}`);
  console.log('');
}, 5000);

// Stop after duration
setTimeout(() => {
  clearInterval(statsInterval);

  console.log('🛑 Stopping load test...');

  clients.forEach(client => {
    client.disconnect();
  });

  const elapsed = (Date.now() - startTime) / 1000;
  const msgRate = messagesReceived / elapsed;

  console.log('');
  console.log('📈 Final Stats:');
  console.log(`   Duration: ${elapsed.toFixed(1)}s`);
  console.log(`   Peak connections: ${connected}`);
  console.log(`   Total messages: ${messagesReceived}`);
  console.log(`   Message rate: ${msgRate.toFixed(1)}/s`);
  console.log(`   Errors: ${errors}`);
  console.log('');

  process.exit(0);
}, DURATION * 1000);
