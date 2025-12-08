/* eslint-env node */
/**
 * Proxy Routes
 * Routes all external API calls through backend to avoid:
 * - Browser Tracking Prevention blocking
 * - Exposing API keys in frontend
 * - CORS issues
 */

import fetch from 'node-fetch';

/**
 * POST /api/proxy/bing/search
 * Proxy Bing search API calls through server
 */
export async function proxyBingSearch(request, reply) {
  try {
    const { q, count = 10, mkt = 'en-US', offset = 0 } = request.body;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return reply.code(400).send({
        error: 'missing-query',
        message: 'Query parameter "q" is required',
      });
    }

    const bingKey = process.env.BING_SEARCH_API_KEY || process.env.BING_API_KEY;
    if (!bingKey || bingKey === 'your-bing-api-key-here') {
      return reply.code(503).send({
        error: 'bing_key_missing',
        message: 'Bing API key not configured on server',
        fallback: true,
      });
    }

    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}&count=${count}&mkt=${mkt}&offset=${offset}&responseFilter=Webpages`;

    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': bingKey,
        'User-Agent': 'RegenBot/1.0',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Proxy] Bing API error:', response.status, errorText);

      if (response.status === 401) {
        return reply.code(503).send({
          error: 'bing_key_invalid',
          message: 'Bing API key is invalid',
          fallback: true,
        });
      }

      if (response.status === 429) {
        return reply.code(503).send({
          error: 'bing_quota_exceeded',
          message: 'Bing API quota exceeded',
          fallback: true,
        });
      }

      return reply.code(response.status).send({
        error: 'bing_api_error',
        message: errorText,
        status: response.status,
      });
    }

    const data = await response.json();
    return reply.send({
      ok: true,
      results: data.webPages?.value || [],
      total: data.webPages?.totalEstimatedMatches || 0,
      source: 'bing',
    });
  } catch (error) {
    console.error('[Proxy] Bing proxy error:', error);
    return reply.code(500).send({
      error: 'bing_proxy_failed',
      message: error.message,
      fallback: true,
    });
  }
}

/**
 * POST /api/proxy/openai
 * Proxy OpenAI API calls through server
 */
export async function proxyOpenAI(request, reply) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (
      !openaiKey ||
      openaiKey === 'your-openai-api-key-here' ||
      openaiKey.startsWith('sk-your-')
    ) {
      return reply.code(503).send({
        error: 'openai_key_missing',
        message: 'OpenAI API key not configured on server',
        fallback: true,
      });
    }

    const {
      model = 'gpt-4o-mini',
      messages,
      temperature = 0.2,
      max_tokens = 1000,
      stream = false,
    } = request.body;

    if (!messages || !Array.isArray(messages)) {
      return reply.code(400).send({
        error: 'missing-messages',
        message: 'Messages array is required',
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream,
      }),
      timeout: 30000,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('[Proxy] OpenAI API error:', response.status, errorData);

      if (response.status === 401) {
        return reply.code(503).send({
          error: 'openai_key_invalid',
          message: 'OpenAI API key is invalid',
          fallback: true,
        });
      }

      if (response.status === 429) {
        return reply.code(503).send({
          error: 'openai_quota_exceeded',
          message: 'OpenAI API quota exceeded or rate limited',
          fallback: true,
        });
      }

      return reply.code(response.status).send({
        error: 'openai_api_error',
        message: errorData.error?.message || 'OpenAI API error',
        status: response.status,
      });
    }

    const data = await response.json();
    return reply.send({
      ok: true,
      ...data,
      source: 'openai',
    });
  } catch (error) {
    console.error('[Proxy] OpenAI proxy error:', error);
    return reply.code(500).send({
      error: 'openai_proxy_failed',
      message: error.message,
      fallback: true,
    });
  }
}

/**
 * POST /api/proxy/anthropic
 * Proxy Anthropic API calls through server
 */
export async function proxyAnthropic(request, reply) {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey || anthropicKey === 'your-anthropic-api-key-here') {
      return reply.code(503).send({
        error: 'anthropic_key_missing',
        message: 'Anthropic API key not configured on server',
        fallback: true,
      });
    }

    const { model = 'claude-3-5-sonnet-20241022', messages, max_tokens = 1000 } = request.body;

    if (!messages || !Array.isArray(messages)) {
      return reply.code(400).send({
        error: 'missing-messages',
        message: 'Messages array is required',
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
      }),
      timeout: 30000,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('[Proxy] Anthropic API error:', response.status, errorData);

      if (response.status === 401) {
        return reply.code(503).send({
          error: 'anthropic_key_invalid',
          message: 'Anthropic API key is invalid',
          fallback: true,
        });
      }

      if (response.status === 429) {
        return reply.code(503).send({
          error: 'anthropic_quota_exceeded',
          message: 'Anthropic API quota exceeded or rate limited',
          fallback: true,
        });
      }

      return reply.code(response.status).send({
        error: 'anthropic_api_error',
        message: errorData.error?.message || 'Anthropic API error',
        status: response.status,
      });
    }

    const data = await response.json();
    return reply.send({
      ok: true,
      ...data,
      source: 'anthropic',
    });
  } catch (error) {
    console.error('[Proxy] Anthropic proxy error:', error);
    return reply.code(500).send({
      error: 'anthropic_proxy_failed',
      message: error.message,
      fallback: true,
    });
  }
}

/**
 * GET /api/_health
 * Server health check endpoint
 */
export async function healthCheck(request, reply) {
  const checks = {
    server: true,
    timestamp: Date.now(),
    providers: {
      bing:
        !!(process.env.BING_SEARCH_API_KEY || process.env.BING_API_KEY) &&
        !(process.env.BING_SEARCH_API_KEY === 'your-bing-api-key-here'),
      openai: !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-your-'),
      anthropic:
        !!process.env.ANTHROPIC_API_KEY &&
        !(process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here'),
      ollama: !!process.env.OLLAMA_URL && !(process.env.OLLAMA_URL === 'your-ollama-url-here'),
    },
  };

  return reply.send({
    ok: true,
    ...checks,
  });
}






