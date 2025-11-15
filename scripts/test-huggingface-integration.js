/**
 * Test Hugging Face Integration
 * Verifies that all Hugging Face features are working correctly
 */

const http = require('http');

const API_BASE = 'http://localhost:8000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testStatus() {
  log('\n📊 Testing Hugging Face Status...', 'cyan');
  try {
    const response = await makeRequest('GET', '/huggingface/status');
    if (response.status === 200) {
      log(`✅ Status check passed`, 'green');
      log(`   Available: ${response.data.available}`, 'blue');
      log(`   Has API Key: ${response.data.has_api_key}`, 'blue');
      return response.data.available && response.data.has_api_key;
    } else {
      log(`❌ Status check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Status check error: ${error.message}`, 'red');
    return false;
  }
}

async function testEmbedding() {
  log('\n🔢 Testing Embedding Generation...', 'cyan');
  try {
    const response = await makeRequest('POST', '/huggingface/embedding', {
      text: 'This is a test sentence for embedding generation.',
      model: 'sentence-transformers/all-MiniLM-L6-v2',
    });

    if (response.status === 200 && response.data.embedding) {
      log(`✅ Embedding generation passed`, 'green');
      log(`   Dimensions: ${response.data.dimensions}`, 'blue');
      log(`   Model: ${response.data.model}`, 'blue');
      log(`   First 5 values: [${response.data.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`, 'blue');
      return true;
    } else {
      log(`❌ Embedding generation failed: ${response.status}`, 'red');
      if (response.data.detail) {
        log(`   Error: ${response.data.detail}`, 'red');
      }
      return false;
    }
  } catch (error) {
    log(`❌ Embedding generation error: ${error.message}`, 'red');
    return false;
  }
}

async function testBatchEmbedding() {
  log('\n📦 Testing Batch Embedding...', 'cyan');
  try {
    const response = await makeRequest('POST', '/huggingface/embedding/batch', {
      texts: [
        'First test sentence.',
        'Second test sentence.',
        'Third test sentence.',
      ],
      model: 'sentence-transformers/all-MiniLM-L6-v2',
    });

    if (response.status === 200 && response.data.embeddings && response.data.embeddings.length === 3) {
      log(`✅ Batch embedding passed`, 'green');
      log(`   Count: ${response.data.count}`, 'blue');
      log(`   Dimensions: ${response.data.dimensions}`, 'blue');
      return true;
    } else {
      log(`❌ Batch embedding failed: ${response.status}`, 'red');
      if (response.data.detail) {
        log(`   Error: ${response.data.detail}`, 'red');
      }
      return false;
    }
  } catch (error) {
    log(`❌ Batch embedding error: ${error.message}`, 'red');
    return false;
  }
}

async function testChat() {
  log('\n💬 Testing Chat Completion...', 'cyan');
  return new Promise((resolve) => {
    const url = new URL('/huggingface/chat', API_BASE);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let buffer = '';
      let receivedTokens = false;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token' && data.text) {
                if (!receivedTokens) {
                  log(`✅ Chat completion started (streaming)`, 'green');
                  receivedTokens = true;
                }
                process.stdout.write(data.text);
              } else if (data.type === 'done') {
                log('\n✅ Chat completion finished', 'green');
                resolve(true);
                return;
              } else if (data.type === 'error') {
                log(`\n❌ Chat completion error: ${data.text}`, 'red');
                resolve(false);
                return;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      res.on('end', () => {
        if (!receivedTokens) {
          log(`❌ Chat completion failed: No tokens received`, 'red');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      log(`❌ Chat completion error: ${error.message}`, 'red');
      resolve(false);
    });

    req.write(JSON.stringify({
      messages: [
        { role: 'user', content: 'Say "Hello from Hugging Face!" in one sentence.' }
      ],
      model: 'meta-llama/Meta-Llama-3-8B-Instruct',
      temperature: 0.7,
      max_tokens: 50,
      stream: true,
    }));

    req.end();

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!receivedTokens) {
        log(`\n❌ Chat completion timeout`, 'red');
        resolve(false);
      }
    }, 30000);
  });
}

async function testRedixStatus() {
  log('\n🤖 Testing Redix Status...', 'cyan');
  try {
    const response = await makeRequest('GET', '/redix/status');
    if (response.status === 200) {
      log(`✅ Redix status check passed`, 'green');
      log(`   Ready: ${response.data.ready}`, 'blue');
      log(`   Hugging Face: ${response.data.huggingface || response.data.hf_available || 'N/A'}`, 'blue');
      log(`   Ollama: ${response.data.ollama || 'N/A'}`, 'blue');
      log(`   Backend: ${response.data.backend || 'N/A'}`, 'blue');
      return true;
    } else {
      log(`❌ Redix status check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Redix status check error: ${error.message}`, 'red');
    return false;
  }
}

async function testRedixAsk() {
  log('\n💭 Testing Redix /ask Endpoint...', 'cyan');
  return new Promise((resolve) => {
    const url = new URL('/redix/ask', API_BASE);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let buffer = '';
      let receivedTokens = false;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token' && data.text) {
                if (!receivedTokens) {
                  log(`✅ Redix /ask started (streaming)`, 'green');
                  receivedTokens = true;
                }
                process.stdout.write(data.text);
              } else if (data.type === 'done') {
                log('\n✅ Redix /ask finished', 'green');
                resolve(true);
                return;
              } else if (data.type === 'error') {
                log(`\n❌ Redix /ask error: ${data.text}`, 'red');
                resolve(false);
                return;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      res.on('end', () => {
        if (!receivedTokens) {
          log(`❌ Redix /ask failed: No tokens received`, 'red');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      log(`❌ Redix /ask error: ${error.message}`, 'red');
      resolve(false);
    });

    req.write(JSON.stringify({
      prompt: 'What is 2+2? Answer in one sentence.',
      stream: true,
    }));

    req.end();

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!receivedTokens) {
        log(`\n❌ Redix /ask timeout`, 'red');
        resolve(false);
      }
    }, 30000);
  });
}

async function runAllTests() {
  log('\n🚀 Starting Hugging Face Integration Tests\n', 'yellow');
  log('='.repeat(60), 'cyan');

  const results = {
    status: false,
    embedding: false,
    batchEmbedding: false,
    chat: false,
    redixStatus: false,
    redixAsk: false,
  };

  // Test 1: Status
  results.status = await testStatus();

  // Test 2: Embedding
  if (results.status) {
    results.embedding = await testEmbedding();
  } else {
    log('\n⚠️  Skipping embedding tests (API not available)', 'yellow');
  }

  // Test 3: Batch Embedding
  if (results.embedding) {
    results.batchEmbedding = await testBatchEmbedding();
  }

  // Test 4: Chat
  if (results.status) {
    results.chat = await testChat();
  }

  // Test 5: Redix Status
  results.redixStatus = await testRedixStatus();

  // Test 6: Redix Ask
  if (results.redixStatus) {
    results.redixAsk = await testRedixAsk();
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 Test Results Summary:', 'yellow');
  log('='.repeat(60), 'cyan');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  log(`\n✅ Status Check: ${results.status ? 'PASS' : 'FAIL'}`, results.status ? 'green' : 'red');
  log(`✅ Embedding: ${results.embedding ? 'PASS' : 'FAIL'}`, results.embedding ? 'green' : 'red');
  log(`✅ Batch Embedding: ${results.batchEmbedding ? 'PASS' : 'FAIL'}`, results.batchEmbedding ? 'green' : 'red');
  log(`✅ Chat Completion: ${results.chat ? 'PASS' : 'FAIL'}`, results.chat ? 'green' : 'red');
  log(`✅ Redix Status: ${results.redixStatus ? 'PASS' : 'FAIL'}`, results.redixStatus ? 'green' : 'red');
  log(`✅ Redix /ask: ${results.redixAsk ? 'PASS' : 'FAIL'}`, results.redixAsk ? 'green' : 'red');

  log('\n' + '='.repeat(60), 'cyan');
  log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! Hugging Face integration is working correctly.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
    process.exit(1);
  }
}

// Check if backend is running
makeRequest('GET', '/health')
  .then(() => {
    log('✅ Backend server is running', 'green');
    runAllTests();
  })
  .catch((error) => {
    log(`\n❌ Backend server is not running!`, 'red');
    log(`   Error: ${error.message}`, 'red');
    log(`   Please start the backend server first:`, 'yellow');
    log(`   cd apps/api && python -m uvicorn main:app --reload`, 'yellow');
    process.exit(1);
  });

