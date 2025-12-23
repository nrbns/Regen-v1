#!/usr/bin/env node
/**
 * Health Check Test Script
 * Tests all backend API health endpoints
 */

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

const healthEndpoints = [
  { path: '/health', name: 'Basic Health' },
  { path: '/api/_health', name: 'API Health' },
  { path: '/api/ollama/health', name: 'Ollama Health' },
  { path: '/api/redix/health', name: 'Redix Health' },
];

async function testHealthEndpoint(path, name) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Create abort controller for timeout compatibility
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        return controller.signal;
      })(),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = { text: await response.text() };
    }

    if (response.ok) {
      console.log(`✅ ${name} (${path}): OK`);
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);
      return { success: true, path, status: response.status, data };
    } else {
      console.log(`⚠️  ${name} (${path}): ${response.status} ${response.statusText}`);
      return { success: false, path, status: response.status, error: data };
    }
  } catch (error) {
    console.log(`❌ ${name} (${path}): ${error.message}`);
    return { success: false, path, error: error.message };
  }
}

async function main() {
  console.log(`\n🔍 Testing health endpoints at ${BASE_URL}\n`);
  console.log('='.repeat(60));

  const results = [];
  for (const endpoint of healthEndpoints) {
    const result = await testHealthEndpoint(endpoint.path, endpoint.name);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }

  console.log('\n' + '='.repeat(60));
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`\n📊 Summary: ${successCount}/${totalCount} endpoints healthy\n`);

  if (successCount === 0) {
    console.log('❌ Backend server may not be running. Start it with: npm run dev:server\n');
    process.exit(1);
  }

  process.exit(successCount === totalCount ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
