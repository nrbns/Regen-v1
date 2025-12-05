#!/usr/bin/env node
/**
 * Comprehensive diagnostic script for Research Mode
 * Checks all components and dependencies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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
      timeout: 5000,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data, raw: data });
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

function checkFileExists(filePath) {
  try {
    return fs.existsSync(path.resolve(filePath));
  } catch {
    return false;
  }
}

async function diagnoseResearchMode() {
  console.log('🔍 Research Mode Diagnostic Tool\n');
  console.log(`API Base: ${API_BASE}\n`);

  const issues = [];
  const warnings = [];

  // 1. Check if backend server is running
  console.log('1. Checking backend server...');
  try {
    const health = await makeRequest('/health');
    if (health.status === 200) {
      console.log('   ✅ Backend server is running\n');
    } else {
      issues.push('Backend server returned non-200 status');
      console.log(`   ❌ Backend server returned status ${health.status}\n`);
    }
  } catch (error) {
    issues.push(`Backend server is not accessible: ${error.message}`);
    console.log(`   ❌ Backend server is not accessible: ${error.message}\n`);
    console.log('   💡 Make sure the server is running: npm run dev:server\n');
  }

  // 2. Check required files
  console.log('2. Checking required files...');
  const requiredFiles = [
    'server/services/research/search.js',
    'server/services/research/enhanced.js',
    'server/services/research/answer.js',
    'server/redix-search.js',
    'server/services/agent/llm.js',
    'src/lib/api-client.ts',
    'src/modes/research/index.tsx',
  ];

  for (const file of requiredFiles) {
    if (checkFileExists(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      issues.push(`Missing file: ${file}`);
      console.log(`   ❌ ${file} - MISSING`);
    }
  }
  console.log('');

  // 3. Test endpoints
  console.log('3. Testing endpoints...');
  const endpoints = [
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET',
    },
    {
      name: 'V1 Search',
      path: '/v1/search',
      method: 'POST',
      body: { q: 'test query', size: 5 },
    },
    {
      name: 'API Research Query',
      path: '/api/research/query',
      method: 'POST',
      body: { query: 'test query' },
    },
    {
      name: 'API Research Enhanced',
      path: '/api/research/enhanced',
      method: 'POST',
      body: { query: 'What is AI?' },
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const result = await makeRequest(endpoint.path, endpoint.method, endpoint.body);
      if (result.status >= 200 && result.status < 300) {
        console.log(`   ✅ ${endpoint.name} - OK (${result.status})`);
        if (endpoint.name === 'API Research Enhanced' && result.data) {
          if (!result.data.summary && !result.data.answer) {
            warnings.push(`${endpoint.name} returned empty summary`);
            console.log(`      ⚠️  Warning: Empty summary in response`);
          }
          if (!result.data.sources || result.data.sources.length === 0) {
            warnings.push(`${endpoint.name} returned no sources`);
            console.log(`      ⚠️  Warning: No sources in response`);
          }
        }
      } else {
        issues.push(`${endpoint.name} returned status ${result.status}`);
        console.log(`   ❌ ${endpoint.name} - FAILED (${result.status})`);
        if (result.data && result.data.error) {
          console.log(`      Error: ${result.data.error}`);
        }
      }
    } catch (error) {
      issues.push(`${endpoint.name} failed: ${error.message}`);
      console.log(`   ❌ ${endpoint.name} - ERROR: ${error.message}`);
    }
  }
  console.log('');

  // 4. Check environment variables
  console.log('4. Checking environment variables...');
  const envVars = {
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.1',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***set***' : 'not set',
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'ollama (default)',
  };

  for (const [key, value] of Object.entries(envVars)) {
    console.log(`   ${key}: ${value}`);
    if (key === 'OPENAI_API_KEY' && value === 'not set') {
      warnings.push('OPENAI_API_KEY not set - will use Ollama (if available)');
    }
  }
  console.log('');

  // 5. Check Ollama availability (if using Ollama)
  if (envVars.LLM_PROVIDER.includes('ollama')) {
    console.log('5. Checking Ollama availability...');
    try {
      const ollamaUrl = envVars.OLLAMA_BASE_URL;
      const ollamaHealth = await makeRequest(`${ollamaUrl}/api/tags`, 'GET');
      if (ollamaHealth.status === 200) {
        console.log('   ✅ Ollama is running');
        if (ollamaHealth.data && ollamaHealth.data.models) {
          const models = ollamaHealth.data.models.map(m => m.name);
          console.log(`   📦 Available models: ${models.join(', ')}`);
          if (!models.some(m => m.includes(envVars.OLLAMA_MODEL))) {
            warnings.push(`Ollama model ${envVars.OLLAMA_MODEL} not found`);
            console.log(`   ⚠️  Warning: Model ${envVars.OLLAMA_MODEL} not found`);
          }
        }
      } else {
        warnings.push('Ollama is not accessible');
        console.log(`   ⚠️  Ollama returned status ${ollamaHealth.status}`);
      }
    } catch (error) {
      warnings.push(`Ollama is not accessible: ${error.message}`);
      console.log(`   ⚠️  Ollama is not accessible: ${error.message}`);
      console.log('   💡 Install Ollama from https://ollama.com and run: ollama pull llama3.1');
    }
    console.log('');
  }

  // Summary
  console.log('\n📊 Diagnostic Summary:');
  console.log(`   Issues found: ${issues.length}`);
  console.log(`   Warnings: ${warnings.length}\n`);

  if (issues.length > 0) {
    console.log('❌ Issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('');
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✨ All checks passed! Research mode should be working.\n');
    process.exit(0);
  } else if (issues.length === 0) {
    console.log('✅ No critical issues. Research mode should work with warnings.\n');
    process.exit(0);
  } else {
    console.log('❌ Critical issues found. Please fix them before using research mode.\n');
    process.exit(1);
  }
}

diagnoseResearchMode().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});




