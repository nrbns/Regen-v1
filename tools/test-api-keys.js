#!/usr/bin/env node
/**
 * Test OpenAI and Anthropic API Keys
 * Validates API keys by making test API calls
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

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

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    log('❌ OPENAI_API_KEY not set in .env', 'red');
    return { success: false, reason: 'not_set' };
  }

  if (apiKey.startsWith('sk-your-') || apiKey === 'your-openai-api-key-here') {
    log('❌ OPENAI_API_KEY appears to be a placeholder', 'red');
    return { success: false, reason: 'placeholder' };
  }

  log('\n🔵 Testing OpenAI API Key...', 'cyan');
  log(`   Key: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`, 'blue');

  try {
    // Test 1: List models (lightweight call)
    log('   → Testing models endpoint...', 'blue');
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    if (!modelsResponse.ok) {
      const errorData = await modelsResponse
        .json()
        .catch(() => ({ error: { message: modelsResponse.statusText } }));
      log(`   ❌ Models endpoint failed: ${modelsResponse.status}`, 'red');
      log(`   Error: ${errorData.error?.message || 'Unknown error'}`, 'red');

      if (modelsResponse.status === 401) {
        return { success: false, reason: 'invalid_key', status: 401 };
      }
      if (modelsResponse.status === 429) {
        return { success: false, reason: 'rate_limited', status: 429 };
      }
      return { success: false, reason: 'api_error', status: modelsResponse.status };
    }

    const modelsData = await modelsResponse.json();
    log(`   ✓ Models endpoint OK (${modelsData.data?.length || 0} models available)`, 'green');

    // Test 2: Make a simple chat completion
    log('   → Testing chat completion...', 'blue');
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
        max_tokens: 10,
      }),
      timeout: 30000,
    });

    if (!chatResponse.ok) {
      const errorData = await chatResponse
        .json()
        .catch(() => ({ error: { message: chatResponse.statusText } }));
      log(`   ❌ Chat completion failed: ${chatResponse.status}`, 'red');
      log(`   Error: ${errorData.error?.message || 'Unknown error'}`, 'red');

      if (chatResponse.status === 401) {
        return { success: false, reason: 'invalid_key', status: 401 };
      }
      if (chatResponse.status === 429) {
        const errorData = await chatResponse.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || '';
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          log(`   ⚠️  Quota exceeded - check billing`, 'yellow');
          return { success: false, reason: 'quota_exceeded', status: 429, validKey: true };
        } else {
          log(`   ⚠️  Rate limited - try again later`, 'yellow');
          return { success: false, reason: 'rate_limited', status: 429, validKey: true };
        }
      }
      if (chatResponse.status === 402) {
        log(`   ⚠️  Payment required - check billing`, 'yellow');
        return { success: false, reason: 'payment_required', status: 402, validKey: true };
      }
      return { success: false, reason: 'api_error', status: chatResponse.status };
    }

    const chatData = await chatResponse.json();
    const content = chatData.choices?.[0]?.message?.content || 'No response';
    log(`   ✓ Chat completion OK`, 'green');
    log(`   Response: "${content}"`, 'green');
    log(`   Model: ${chatData.model}`, 'green');
    log(`   Tokens used: ${chatData.usage?.total_tokens || 'N/A'}`, 'green');

    return { success: true, model: chatData.model, tokens: chatData.usage?.total_tokens };
  } catch (error) {
    log(`   ❌ Network error: ${error.message}`, 'red');
    return { success: false, reason: 'network_error', error: error.message };
  }
}

async function testAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    log('❌ ANTHROPIC_API_KEY not set in .env', 'red');
    return { success: false, reason: 'not_set' };
  }

  if (apiKey === 'your-anthropic-api-key-here' || apiKey.startsWith('sk-ant-')) {
    // Check if it's a placeholder (though real keys also start with sk-ant-)
    if (apiKey === 'your-anthropic-api-key-here') {
      log('❌ ANTHROPIC_API_KEY appears to be a placeholder', 'red');
      return { success: false, reason: 'placeholder' };
    }
  }

  log('\n🟣 Testing Anthropic API Key...', 'cyan');
  log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`, 'blue');

  try {
    // Test: Make a simple message call
    log('   → Testing messages endpoint...', 'blue');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
        }),
      timeout: 30000,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      const errorMsg = errorData.error?.message || '';
      log(`   ❌ Messages endpoint failed: ${response.status}`, 'red');
      log(`   Error: ${errorMsg || 'Unknown error'}`, 'red');

      if (response.status === 401) {
        return { success: false, reason: 'invalid_key', status: 401 };
      }
      if (response.status === 400) {
        if (
          errorMsg.includes('credit') ||
          errorMsg.includes('billing') ||
          errorMsg.includes('balance')
        ) {
          log(`   ⚠️  Credit balance too low - add credits`, 'yellow');
          return { success: false, reason: 'insufficient_credits', status: 400, validKey: true };
        }
        // Other 400 errors might be invalid key format
        return { success: false, reason: 'api_error', status: 400 };
      }
      if (response.status === 429) {
        log(`   ⚠️  Rate limited or quota exceeded`, 'yellow');
        return { success: false, reason: 'quota_exceeded', status: 429, validKey: true };
      }
      if (response.status === 402) {
        log(`   ⚠️  Payment required - check billing`, 'yellow');
        return { success: false, reason: 'payment_required', status: 402, validKey: true };
      }
      return { success: false, reason: 'api_error', status: response.status };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || 'No response';
    log(`   ✓ Messages endpoint OK`, 'green');
    log(`   Response: "${content}"`, 'green');
    log(`   Model: ${data.model}`, 'green');
    log(
      `   Tokens used: ${data.usage?.input_tokens || 0} input + ${data.usage?.output_tokens || 0} output`,
      'green'
    );

    return { success: true, model: data.model, tokens: data.usage };
  } catch (error) {
    log(`   ❌ Network error: ${error.message}`, 'red');
    return { success: false, reason: 'network_error', error: error.message };
  }
}

async function main() {
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  API Key Validation Test', 'cyan');
  log('═══════════════════════════════════════════════════════\n', 'cyan');

  const results = {
    openai: await testOpenAI(),
    anthropic: await testAnthropic(),
  };

  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  Summary', 'cyan');
  log('═══════════════════════════════════════════════════════\n', 'cyan');

  // OpenAI Summary
  if (results.openai.success) {
    log('✅ OpenAI API Key: VALID & WORKING', 'green');
    log(`   Model: ${results.openai.model}`, 'green');
    log(`   Tokens: ${results.openai.tokens}`, 'green');
  } else if (results.openai.validKey) {
    log('⚠️  OpenAI API Key: VALID but has billing issues', 'yellow');
    if (results.openai.reason === 'quota_exceeded') {
      log('   → Key is valid but quota exceeded', 'yellow');
      log('   → Action: Add credits at https://platform.openai.com/account/billing', 'yellow');
    } else if (results.openai.reason === 'payment_required') {
      log('   → Key is valid but payment required', 'yellow');
      log(
        '   → Action: Add payment method at https://platform.openai.com/account/billing',
        'yellow'
      );
    }
  } else {
    log('❌ OpenAI API Key: INVALID or NOT SET', 'red');
    if (results.openai.reason === 'not_set') {
      log('   → Set OPENAI_API_KEY in .env file', 'yellow');
    } else if (results.openai.reason === 'placeholder') {
      log('   → Replace placeholder with real API key', 'yellow');
    } else if (results.openai.reason === 'invalid_key') {
      log('   → API key is invalid. Check your OpenAI account.', 'yellow');
      log('   → Get key at: https://platform.openai.com/api-keys', 'yellow');
    } else {
      log(`   → Error: ${results.openai.reason}`, 'yellow');
    }
  }

  // Anthropic Summary
  if (results.anthropic.success) {
    log('✅ Anthropic API Key: VALID & WORKING', 'green');
    log(`   Model: ${results.anthropic.model}`, 'green');
    log(
      `   Tokens: ${results.anthropic.tokens?.input_tokens || 0} input + ${results.anthropic.tokens?.output_tokens || 0} output`,
      'green'
    );
  } else if (results.anthropic.validKey) {
    log('⚠️  Anthropic API Key: VALID but has billing issues', 'yellow');
    if (results.anthropic.reason === 'insufficient_credits') {
      log('   → Key is valid but credit balance too low', 'yellow');
      log('   → Action: Add credits at https://console.anthropic.com/settings/billing', 'yellow');
    } else if (results.anthropic.reason === 'quota_exceeded') {
      log('   → Key is valid but quota exceeded', 'yellow');
      log('   → Action: Check billing at https://console.anthropic.com/settings/billing', 'yellow');
    } else if (results.anthropic.reason === 'payment_required') {
      log('   → Key is valid but payment required', 'yellow');
      log(
        '   → Action: Add payment method at https://console.anthropic.com/settings/billing',
        'yellow'
      );
    }
  } else {
    log('❌ Anthropic API Key: INVALID or NOT SET', 'red');
    if (results.anthropic.reason === 'not_set') {
      log('   → Set ANTHROPIC_API_KEY in .env file', 'yellow');
    } else if (results.anthropic.reason === 'placeholder') {
      log('   → Replace placeholder with real API key', 'yellow');
    } else if (results.anthropic.reason === 'invalid_key') {
      log('   → API key is invalid. Check your Anthropic account.', 'yellow');
      log('   → Get key at: https://console.anthropic.com/settings/keys', 'yellow');
    } else {
      log(`   → Error: ${results.anthropic.reason}`, 'yellow');
    }
  }

  log('\n');

  // Exit code
  const allWorking = results.openai.success && results.anthropic.success;
  const allValid =
    (results.openai.success || results.openai.validKey) &&
    (results.anthropic.success || results.anthropic.validKey);
  const anyWorking = results.openai.success || results.anthropic.success;
  const anyValid =
    results.openai.success ||
    results.openai.validKey ||
    results.anthropic.success ||
    results.anthropic.validKey;

  log('\n');
  if (allWorking) {
    log('🎉 All API keys are valid and working!', 'green');
    process.exit(0);
  } else if (allValid) {
    log('⚠️  All API keys are valid but have billing/quota issues.', 'yellow');
    log('   → Add credits or upgrade plans to use the APIs.', 'yellow');
    process.exit(0); // Exit 0 because keys are valid
  } else if (anyWorking) {
    log('⚠️  Some API keys are working, others need attention.', 'yellow');
    process.exit(0);
  } else if (anyValid) {
    log('⚠️  Some API keys are valid but need billing setup.', 'yellow');
    process.exit(0); // Exit 0 because keys are valid
  } else {
    log('❌ No valid API keys found. Please configure your .env file.', 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
