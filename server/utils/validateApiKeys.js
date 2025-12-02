/* eslint-env node */
/**
 * API Key Validation
 * Validates API keys at startup and logs friendly warnings
 */

/**
 * Validate API keys and log warnings for missing/invalid keys
 */
export function validateApiKeys() {
  const warnings = [];
  const available = [];

  // OpenAI
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    warnings.push('[LLM] OPENAI_API_KEY not set — OpenAI disabled');
  } else {
    available.push('OpenAI');
  }

  // Anthropic
  if (
    !process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here'
  ) {
    warnings.push('[LLM] ANTHROPIC_API_KEY not set — Anthropic disabled');
  } else {
    available.push('Anthropic');
  }

  // Bing
  if (
    !process.env.BING_SEARCH_API_KEY ||
    process.env.BING_SEARCH_API_KEY === 'your-bing-api-key-here'
  ) {
    warnings.push('[Search] BING_SEARCH_API_KEY not set — Bing search disabled');
  } else {
    available.push('Bing');
  }

  // Google Search
  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    warnings.push(
      '[Search] GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not set — Google search disabled'
    );
  } else {
    available.push('Google');
  }

  // Ollama
  const ollamaUrl =
    process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  if (!ollamaUrl || ollamaUrl === 'your-ollama-url-here') {
    warnings.push('[LLM] OLLAMA_URL not set — Ollama disabled');
  } else {
    available.push(`Ollama (${ollamaUrl})`);
  }

  // Sentry
  if (
    process.env.SENTRY_DSN &&
    process.env.SENTRY_DSN !== 'your-sentry-dsn-here' &&
    process.env.SENTRY_DSN.trim() !== ''
  ) {
    // Sentry is configured
  } else {
    warnings.push('[Monitoring] SENTRY_DSN not set — Sentry disabled (this is OK for local dev)');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.log('\n[API Keys] Missing or invalid API keys:');
    warnings.forEach(w => console.warn('  ' + w));
  }

  // Log available providers
  if (available.length > 0) {
    console.log('\n[API Keys] Available providers:');
    available.forEach(a => console.log('  ✓ ' + a));
  }

  // Summary
  if (available.length === 0) {
    console.warn(
      '\n[API Keys] ⚠️  No API keys configured. Research features will use fallback methods.'
    );
    console.warn('  Set API keys in .env file to enable full functionality.');
  } else {
    console.log(`\n[API Keys] ✓ ${available.length} provider(s) configured`);
  }

  return {
    warnings,
    available,
    hasLLM: available.some(
      a => a.includes('OpenAI') || a.includes('Anthropic') || a.includes('Ollama')
    ),
    hasSearch: available.some(a => a.includes('Bing') || a.includes('Google')),
  };
}
