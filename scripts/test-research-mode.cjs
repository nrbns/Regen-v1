#!/usr/bin/env node
/**
 * Test script to verify Research Mode is working
 * Tests both backend endpoints and frontend integration
 */

const http = require('http');

const API_BASE = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

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
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testResearchMode() {
  console.log('🔍 Testing Research Mode...\n');
  console.log(`API Base: ${API_BASE}\n`);

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const result = await makeRequest('/health');
        return result.status === 200;
      },
    },
    {
      name: 'V1 Search Endpoint',
      test: async () => {
        const result = await makeRequest('/v1/search', 'POST', {
          q: 'test query',
          size: 5,
        });
        return result.status === 200 && result.data.results;
      },
    },
    {
      name: 'API Research Query Endpoint',
      test: async () => {
        const result = await makeRequest('/api/research/query', 'POST', {
          query: 'test query',
          language: 'en',
        });
        return result.status === 200 && result.data.results;
      },
    },
    {
      name: 'API Research Enhanced Endpoint',
      test: async () => {
        const result = await makeRequest('/api/research/enhanced', 'POST', {
          query: 'test query',
        });
        return result.status === 200 && result.data;
      },
    },
    {
      name: 'V1 Answer Endpoint',
      test: async () => {
        const result = await makeRequest('/v1/answer', 'POST', {
          q: 'What is AI?',
        });
        return result.status === 200 && result.data.answer;
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      console.log(`Testing: ${name}...`);
      const result = await test();
      if (result) {
        console.log(`✅ ${name} - PASSED\n`);
        passed++;
      } else {
        console.log(`❌ ${name} - FAILED (unexpected result)\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}\n`);
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✨ All Research Mode tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

testResearchMode().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});




