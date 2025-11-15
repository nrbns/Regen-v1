/**
 * Test API Health and Availability
 * Checks if the API server is running before running tests
 */

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';

async function checkApiHealth() {
  console.log('🔍 Checking API server health...');
  try {
    const response = await fetch(`${API_URL}/`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API server is running');
      console.log(`   Status: ${data.status}`);
      console.log(`   Message: ${data.message}`);
      return true;
    } else {
      console.log(`⚠️  API server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ API server is not running');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 To start the API server:');
    console.log('   cd apps/api');
    console.log('   python -m uvicorn main:app --reload --port 8000');
    return false;
  }
}

async function testEndpoints() {
  console.log('\n📋 Testing Endpoint Availability...\n');
  
  const endpoints = [
    { path: '/', method: 'GET', name: 'Root' },
    { path: '/extract/extract', method: 'POST', name: 'Extract' },
    { path: '/llm/ask-about-page', method: 'POST', name: 'Ask About Page' },
    { path: '/llm/summarize-page', method: 'POST', name: 'Summarize Page' },
    { path: '/llm/assistant', method: 'POST', name: 'LLM Assistant' },
    { path: '/search', method: 'POST', name: 'Search' },
    { path: '/search/ai-search', method: 'POST', name: 'AI Search' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined,
      });
      
      // 404/405 is expected for some endpoints without proper params
      // 422 means endpoint exists but validation failed (expected)
      if (response.status === 404 || response.status === 405) {
        console.log(`⚠️  ${endpoint.name}: Endpoint not found (${response.status})`);
      } else if (response.status === 422) {
        console.log(`✅ ${endpoint.name}: Endpoint exists (validation error expected)`);
      } else if (response.ok) {
        console.log(`✅ ${endpoint.name}: Endpoint working`);
      } else {
        console.log(`⚠️  ${endpoint.name}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🧪 API Health Check\n');
  console.log(`API URL: ${API_URL}\n`);
  
  const isHealthy = await checkApiHealth();
  
  if (isHealthy) {
    await testEndpoints();
    console.log('\n✅ API server is ready for testing');
    console.log('\n💡 Run full tests with:');
    console.log('   node scripts/test-llm-assistant.js');
    console.log('   or');
    console.log('   python apps/api/test_llm_assistant.py');
  } else {
    console.log('\n❌ API server is not available');
    console.log('   Please start the server before running tests');
  }
}

main().catch(console.error);


