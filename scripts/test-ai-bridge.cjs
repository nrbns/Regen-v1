/**
 * Test script for AI Bridge
 * Tests both mock and real providers
 */

// Use native fetch (Node.js 18+ has built-in fetch)
// Node.js 22 has native fetch, so we use it directly
const fetch = globalThis.fetch;

const BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://127.0.0.1:4300';
const BRIDGE_TOKEN = process.env.AI_BRIDGE_TOKEN || 'LOCAL_DEV_TOKEN';

async function testHealth() {
  console.log('🏥 Testing health endpoint...');
  try {
    const response = await fetch(`${BRIDGE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return data;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    throw error;
  }
}

async function testChat(messages, expectedProvider = 'mock') {
  console.log(`\n💬 Testing chat with provider: ${expectedProvider}...`);
  console.log(`   Message: "${messages[0].content}"`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${BRIDGE_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRIDGE_TOKEN}`
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Chat test passed (${latency}ms)`);
    console.log(`   Provider: ${data.provider}`);
    console.log(`   Response: "${data.choices[0].message.content.substring(0, 100)}..."`);
    console.log(`   Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    
    if (data._fallbackUsed) {
      console.log(`   ⚠️  Fallback used: ${data._fallbackReason}`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Chat test failed:', error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🧪 AI Bridge Test Suite\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Health check
    const health = await testHealth();
    
    // Test 2: Mock provider (should always work)
    await testChat([
      { role: 'user', content: 'Hello, how are you?' }
    ], 'mock');
    
    // Test 3: Multiple messages
    await testChat([
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '2+2 equals 4.' },
      { role: 'user', content: 'What about 3+3?' }
    ], 'mock');
    
    // Test 4: Longer query
    await testChat([
      { role: 'user', content: 'Explain artificial intelligence in one sentence.' }
    ], 'mock');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!');
    console.log(`\nProvider status: ${health.provider}`);
    if (health.providerAvailable === false) {
      console.log(`⚠️  Requested provider (${health.requestedProvider}) not available`);
      console.log(`   Error: ${health.providerError}`);
      console.log(`\n💡 To use a real provider:`);
      if (health.requestedProvider === 'ollama') {
        console.log(`   1. Install Ollama: https://ollama.com`);
        console.log(`   2. Run: ollama serve`);
        console.log(`   3. Pull a model: ollama pull llama3.1:8b`);
        console.log(`   4. Set: export LLM_PROVIDER=ollama`);
      } else if (health.requestedProvider === 'openai') {
        console.log(`   1. Get API key: https://platform.openai.com/api-keys`);
        console.log(`   2. Set: export OPENAI_API_KEY=sk-...`);
        console.log(`   3. Set: export LLM_PROVIDER=openai`);
      }
    } else {
      console.log(`✅ Provider ${health.provider} is available and working`);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();

