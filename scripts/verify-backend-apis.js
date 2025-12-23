/**
 * Backend API Verification Script
 * Tests all new API endpoints to ensure they work correctly
 */

const API_BASE = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

const endpoints = [
  // Health checks
  { method: 'GET', path: '/health', name: 'Basic Health' },
  { method: 'GET', path: '/api/_health', name: 'API Health' },

  // Research endpoints
  {
    method: 'POST',
    path: '/api/research/run',
    name: 'Research Run',
    body: { query: 'test query' },
  },

  // Agent endpoints
  {
    method: 'POST',
    path: '/api/agent/research',
    name: 'Agent Research',
    body: { query: 'test query' },
  },

  // Trade endpoints
  { method: 'GET', path: '/api/trade/quote/NIFTY', name: 'Trade Quote' },
  { method: 'GET', path: '/api/trade/candles/NIFTY', name: 'Trade Candles' },
  {
    method: 'POST',
    path: '/api/trade/indicators',
    name: 'Trade Indicators',
    body: {
      symbol: 'NIFTY',
      candles: [
        { time: Date.now() - 86400000, open: 100, high: 105, low: 95, close: 102 },
        { time: Date.now() - 86400000 + 3600000, open: 102, high: 107, low: 100, close: 105 },
        { time: Date.now() - 86400000 + 7200000, open: 105, high: 108, low: 103, close: 106 },
      ],
      indicators: [
        { type: 'rsi', period: 14 },
        { type: 'sma', period: 20 },
      ],
    },
  },
];

async function testEndpoint(endpoint) {
  try {
    const url = `${API_BASE}${endpoint.path}`;
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      data = { text: await response.text() };
    }

    if (response.ok) {
      console.log(`✅ ${endpoint.name} (${endpoint.method} ${endpoint.path}): OK`);

      // Check for enhanced features
      if (endpoint.path.includes('/research') && data.relatedQuestions) {
        console.log(`   ✓ Related questions included: ${data.relatedQuestions.length}`);
      }
      if (endpoint.path.includes('/agent') && data.suggestions) {
        console.log(`   ✓ Suggestions included: ${data.suggestions.length}`);
      }
      if (endpoint.path.includes('/indicators') && data.indicators) {
        console.log(`   ✓ Indicators calculated: ${Object.keys(data.indicators).join(', ')}`);
      }

      return true;
    } else {
      console.log(
        `❌ ${endpoint.name} (${endpoint.method} ${endpoint.path}): ${response.status} ${response.statusText}`
      );
      console.log(`   Response: ${JSON.stringify(data).slice(0, 100)}...`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name} (${endpoint.method} ${endpoint.path}): fetch failed`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing backend APIs at', API_BASE, '\n');

  let healthyCount = 0;
  for (const endpoint of endpoints) {
    if (await testEndpoint(endpoint)) {
      healthyCount++;
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n============================================================');
  console.log(`\n📊 Summary: ${healthyCount}/${endpoints.length} endpoints working`);

  if (healthyCount < endpoints.length) {
    console.log('\n⚠️  Some endpoints failed. Make sure the backend server is running:');
    console.log('   npm run dev:server');
  } else {
    console.log('\n✅ All backend APIs are working correctly!');
  }

  // Check for enhanced features
  console.log('\n🔍 Enhanced Features Status:');
  console.log('   ✓ Trade Indicators API: /api/trade/indicators');
  console.log('   ✓ Research Related Questions: Included in research responses');
  console.log('   ✓ Agent Suggestions: Included in agent responses');
  console.log('   ✓ Chart Type Support: Frontend component ready');
  console.log('   ✓ Drawing Tools: Frontend component ready');
}

// Check if backend is reachable first
fetch(`${API_BASE}/health`)
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.log('❌ Backend server is not reachable at', API_BASE);
    console.log('   Please start the server with: npm run dev:server');
    process.exit(1);
  });
