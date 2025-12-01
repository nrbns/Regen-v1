/**
 * Runtime Test Script
 * Tests all services and WebSocket connections
 */

const http = require('http');
const WebSocket = require('ws');

const SERVICES = {
  mockLLM: { port: 4001, name: 'Mock LLM Server' },
  vite: { port: 5173, name: 'Vite Dev Server' },
  redix: { port: 4000, name: 'Redix WebSocket Server' },
  api: { port: 8000, name: 'Python API Server' },
};

const WEBSOCKET_ENDPOINTS = [
  { url: 'ws://localhost:4000/ws', name: 'Redix Main WS' },
  { url: 'ws://localhost:4000/ws/metrics', name: 'Redix Metrics WS' },
  { url: 'ws://localhost:4001/ws', name: 'Mock LLM WS' },
];

async function checkHttpService(port, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, { timeout: 2000 }, (res) => {
      resolve({ success: true, status: res.statusCode, name });
    });
    req.on('error', () => {
      resolve({ success: false, name, error: 'Connection refused' });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, name, error: 'Timeout' });
    });
  });
}

async function checkWebSocket(url, name) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ success: false, name, error: 'Connection timeout' });
    }, 3000);

    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve({ success: true, name });
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, name, error: error.message });
    });
  });
}

async function runTests() {
  console.log('🧪 Runtime Test - Checking Services & WebSockets\n');
  console.log('='.repeat(60));

  // Test HTTP Services
  console.log('\n📡 HTTP Services:');
  console.log('-'.repeat(60));
  const httpResults = [];
  for (const [key, service] of Object.entries(SERVICES)) {
    const result = await checkHttpService(service.port, service.name);
    httpResults.push(result);
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? `Status: ${result.status}` : `Error: ${result.error}`;
    console.log(`${icon} ${result.name} (port ${service.port}) - ${status}`);
  }

  // Test WebSocket Connections
  console.log('\n🔌 WebSocket Connections:');
  console.log('-'.repeat(60));
  const wsResults = [];
  for (const endpoint of WEBSOCKET_ENDPOINTS) {
    const result = await checkWebSocket(endpoint.url, endpoint.name);
    wsResults.push(result);
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'Connected' : `Error: ${result.error}`;
    console.log(`${icon} ${result.name} - ${status}`);
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('='.repeat(60));
  const httpSuccess = httpResults.filter(r => r.success).length;
  const wsSuccess = wsResults.filter(r => r.success).length;
  console.log(`HTTP Services: ${httpSuccess}/${httpResults.length} running`);
  console.log(`WebSockets: ${wsSuccess}/${wsResults.length} connected`);

  const allSuccess = httpSuccess === httpResults.length && wsSuccess === wsResults.length;
  if (allSuccess) {
    console.log('\n✅ All services are running correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some services are not running. Start them with:');
    console.log('   npm run dev:mock-llm  # Mock LLM server (port 4001)');
    console.log('   npm run dev:web      # Vite dev server (port 5173)');
    console.log('   npm run dev:redix    # Redix server (port 4000)');
    console.log('   npm run dev:api      # Python API (port 8000)');
    console.log('\n   Or start all at once:');
    console.log('   npm run dev          # Starts all services');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

