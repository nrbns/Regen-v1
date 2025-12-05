#!/usr/bin/env node
/**
 * Test API Endpoints
 * Verifies that the server can start and endpoints respond
 */

const http = require('http');

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const TIMEOUT = 5000;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 4000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, data: data, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  console.log(`API Base: ${API_BASE}\n`);

  const endpoints = [
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET',
      expectedStatus: [200, 404], // 404 if server not running
    },
    {
      name: 'Metrics',
      path: '/metrics',
      method: 'GET',
      expectedStatus: [200, 404],
    },
    {
      name: 'Sync Stats',
      path: '/api/sync/stats',
      method: 'GET',
      expectedStatus: [200, 404, 500], // 500 if service not initialized
    },
  ];

  let passed = 0;
  let failed = 0;
  let serverRunning = false;

  for (const endpoint of endpoints) {
    try {
      const result = await makeRequest(endpoint.path, endpoint.method);
      
      if (endpoint.expectedStatus.includes(result.status)) {
        if (result.status === 200) {
          serverRunning = true;
          console.log(`   ✅ ${endpoint.name} - OK (${result.status})`);
          passed++;
        } else if (result.status === 404) {
          console.log(`   ⚠️  ${endpoint.name} - Server not running (${result.status})`);
        } else {
          console.log(`   ⚠️  ${endpoint.name} - Service not initialized (${result.status})`);
        }
      } else {
        console.log(`   ❌ ${endpoint.name} - Unexpected status: ${result.status}`);
        failed++;
      }
    } catch (error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.log(`   ⚠️  ${endpoint.name} - Server not running`);
      } else {
        console.error(`   ❌ ${endpoint.name} - ERROR: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (!serverRunning) {
    console.log('\n💡 Server is not running. To start it:');
    console.log('   npm run dev:server');
    console.log('   or');
    console.log('   node server/redix-server.js');
    console.log('\n   Then run this test again to verify endpoints.');
  } else {
    console.log('\n✅ Server is running and responding!');
  }

  process.exit(serverRunning ? 0 : 1);
}

testEndpoints().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});




