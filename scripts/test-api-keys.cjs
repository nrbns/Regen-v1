#!/usr/bin/env node
/**
 * Test API Keys
 * Verifies that all configured API keys are valid and working
 */

const http = require('http');
const https = require('https');
const { config } = require('dotenv');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
config({ path: envPath });

const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  groq: process.env.GROQ_API_KEY,
  huggingface: process.env.HUGGINGFACE_API_KEY,
};

const PROVIDERS = {
  ollama: {
    url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    testEndpoint: '/api/tags',
  },
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: options.timeout || 5000,
    };

    const req = client.request(requestOptions, res => {
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

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testOpenAI() {
  const apiKey = API_KEYS.openai;
  
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return { status: 'not_configured', message: 'OpenAI API key not configured' };
  }

  try {
    const response = await makeRequest('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      return { status: 'valid', message: 'OpenAI API key is valid', models: response.data.data?.length || 0 };
    } else if (response.status === 401) {
      return { status: 'invalid', message: 'OpenAI API key is invalid or expired' };
    } else {
      return { status: 'error', message: `OpenAI API returned status ${response.status}` };
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { status: 'timeout', message: 'OpenAI API request timed out' };
    }
    return { status: 'error', message: error.message };
  }
}

async function testAnthropic() {
  const apiKey = API_KEYS.anthropic;
  
  if (!apiKey || apiKey === 'sk-ant-your-anthropic-api-key-here') {
    return { status: 'not_configured', message: 'Anthropic API key not configured' };
  }

  try {
    const response = await makeRequest('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      return { status: 'valid', message: 'Anthropic API key is valid' };
    } else if (response.status === 401) {
      return { status: 'invalid', message: 'Anthropic API key is invalid or expired' };
    } else {
      return { status: 'error', message: `Anthropic API returned status ${response.status}` };
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { status: 'timeout', message: 'Anthropic API request timed out' };
    }
    return { status: 'error', message: error.message };
  }
}

async function testOllama() {
  const provider = PROVIDERS.ollama;
  
  try {
    const response = await makeRequest(`${provider.url}${provider.testEndpoint}`, {
      method: 'GET',
      timeout: 5000,
    });

    if (response.status === 200) {
      const models = response.data.models || [];
      return {
        status: 'valid',
        message: `Ollama is running (${models.length} models available)`,
        models: models.map(m => m.name),
        url: provider.url,
      };
    } else {
      return { status: 'error', message: `Ollama returned status ${response.status}` };
    }
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      return {
        status: 'not_running',
        message: `Ollama is not running at ${provider.url}`,
        suggestion: 'Install Ollama from https://ollama.com and run: ollama pull phi3:mini',
      };
    }
    return { status: 'error', message: error.message };
  }
}

async function testGroq() {
  const apiKey = API_KEYS.groq;
  
  if (!apiKey || apiKey === 'gsk_your-groq-api-key-here') {
    return { status: 'not_configured', message: 'Groq API key not configured' };
  }

  try {
    const response = await makeRequest('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      return { status: 'valid', message: 'Groq API key is valid' };
    } else if (response.status === 401) {
      return { status: 'invalid', message: 'Groq API key is invalid or expired' };
    } else {
      return { status: 'error', message: `Groq API returned status ${response.status}` };
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { status: 'timeout', message: 'Groq API request timed out' };
    }
    return { status: 'error', message: error.message };
  }
}

async function testHuggingFace() {
  const apiKey = API_KEYS.huggingface;
  
  if (!apiKey || apiKey === 'hf_your-huggingface-token-here') {
    return { status: 'not_configured', message: 'HuggingFace API key not configured' };
  }

  try {
    const response = await makeRequest('https://api-inference.huggingface.co/api/whoami', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      return { status: 'valid', message: 'HuggingFace API key is valid', user: response.data.name };
    } else if (response.status === 401) {
      return { status: 'invalid', message: 'HuggingFace API key is invalid or expired' };
    } else {
      return { status: 'error', message: `HuggingFace API returned status ${response.status}` };
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { status: 'timeout', message: 'HuggingFace API request timed out' };
    }
    return { status: 'error', message: error.message };
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'valid':
      return '✅';
    case 'invalid':
      return '❌';
    case 'not_configured':
      return '⚪';
    case 'not_running':
      return '⚠️';
    case 'timeout':
      return '⏱️';
    case 'error':
      return '🔴';
    default:
      return '❓';
  }
}

async function testAllKeys() {
  console.log('🔑 Testing API Keys...\n');

  const results = {
    openai: await testOpenAI(),
    anthropic: await testAnthropic(),
    ollama: await testOllama(),
    groq: await testGroq(),
    huggingface: await testHuggingFace(),
  };

  console.log('📊 Test Results:\n');

  for (const [provider, result] of Object.entries(results)) {
    const icon = getStatusIcon(result.status);
    console.log(`${icon} ${provider.toUpperCase()}: ${result.message}`);
    
    if (result.models && Array.isArray(result.models)) {
      console.log(`   Models: ${result.models.slice(0, 3).join(', ')}${result.models.length > 3 ? '...' : ''}`);
    }
    if (result.user) {
      console.log(`   User: ${result.user}`);
    }
    if (result.suggestion) {
      console.log(`   💡 ${result.suggestion}`);
    }
    console.log('');
  }

  // Summary
  const valid = Object.values(results).filter(r => r.status === 'valid').length;
  const invalid = Object.values(results).filter(r => r.status === 'invalid').length;
  const notConfigured = Object.values(results).filter(r => r.status === 'not_configured').length;
  const notRunning = Object.values(results).filter(r => r.status === 'not_running').length;

  console.log('📈 Summary:');
  console.log(`   ✅ Valid: ${valid}`);
  console.log(`   ❌ Invalid: ${invalid}`);
  console.log(`   ⚪ Not Configured: ${notConfigured}`);
  console.log(`   ⚠️  Not Running: ${notRunning}`);

  // Check LLM provider
  const llmProvider = process.env.LLM_PROVIDER || process.env.AI_PROVIDER || 'ollama';
  console.log(`\n🤖 Active LLM Provider: ${llmProvider}`);

  if (llmProvider === 'ollama') {
    if (results.ollama.status === 'valid') {
      console.log('   ✅ Ollama is working - you can use AI features!');
    } else {
      console.log('   ⚠️  Ollama is not running - AI features will be limited');
      console.log('   💡 Install Ollama: https://ollama.com');
      console.log('   💡 Then run: ollama pull phi3:mini');
    }
  } else if (llmProvider === 'openai') {
    if (results.openai.status === 'valid') {
      console.log('   ✅ OpenAI is working - you can use AI features!');
    } else {
      console.log('   ⚠️  OpenAI API key is not valid - AI features will not work');
    }
  }

  console.log('\n💡 To update API keys, edit the .env file in the project root.');

  return results;
}

testAllKeys().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

