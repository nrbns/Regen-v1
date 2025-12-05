/**
 * Environment Variable Loader
 * Centralized .env loading for all server modules
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const envPath = resolve(__dirname, '../../.env');
const result = config({ path: envPath });

if (result.error) {
  console.warn('[EnvLoader] Could not load .env file:', result.error.message);
  console.warn('[EnvLoader] Using system environment variables only');
} else {
  console.log('[EnvLoader] Environment variables loaded from .env');
}

// Export helper to verify API keys are loaded
export function verifyApiKeys() {
  const keys = {
    openai:
      !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key-here',
    anthropic:
      !!process.env.ANTHROPIC_API_KEY &&
      process.env.ANTHROPIC_API_KEY !== 'sk-ant-your-anthropic-api-key-here',
    ollama: !!process.env.OLLAMA_BASE_URL,
    provider: process.env.AI_PROVIDER || process.env.LLM_PROVIDER || 'ollama',
  };

  console.log('[EnvLoader] API Key Status:', {
    openai: keys.openai ? '✅ Configured' : '❌ Not configured',
    anthropic: keys.anthropic ? '✅ Configured' : '❌ Not configured',
    ollama: keys.ollama ? '✅ Configured' : '❌ Not configured',
    provider: keys.provider,
  });

  return keys;
}



