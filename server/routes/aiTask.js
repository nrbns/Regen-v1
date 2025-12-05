/* eslint-env node */
/**
 * AI Task Route
 * Centralizes AI tasks, handles 429 with backoff, and returns consistent JSON
 */

import fetch from 'node-fetch';

/**
 * Exponential backoff wrapper for retrying failed requests
 */
async function withBackoff(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    const status = err?.status || err?.response?.status || err?.statusCode;
    if (retries > 0 && [429, 502, 503, 504].includes(status)) {
      const delay = 1000 * (4 - retries);
      await new Promise(r => setTimeout(r, delay));
      return withBackoff(fn, retries - 1);
    }
    throw err;
  }
}

/**
 * POST /api/ai/task
 * Unified AI task endpoint with backoff and fallback
 */
export async function aiTask(request, reply) {
  try {
    const { provider, payload } = request.body || {};

    if (!provider) {
      return reply.code(400).send({
        error: 'missing-provider',
        message: 'Provider is required. Use: openai, anthropic, or ollama',
      });
    }

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your-')) {
        return reply.code(503).send({
          error: 'openai_key_missing',
          message: 'OpenAI API key not configured on server',
          fallback: true,
        });
      }

      const run = async () => {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const json = await r.json();

        if (r.status === 429) {
          const ex = new Error('rate_limited');
          ex.status = 429;
          throw ex;
        }

        return { status: r.status, json };
      };

      try {
        const result = await withBackoff(run, 3);
        return reply.code(result.status).send(result.json);
      } catch (err) {
        if (err.status === 429) {
          // Mock fallback for quota issues
          return reply.send({
            id: 'mock-1',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content:
                    'Demo fallback answer due to provider quota issues. Please check your OpenAI API key and billing.',
                },
              },
            ],
            model: 'gpt-4o-mini',
            fallback: true,
          });
        }
        throw err;
      }
    }

    if (provider === 'anthropic') {
      if (
        !process.env.ANTHROPIC_API_KEY ||
        process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here'
      ) {
        return reply.code(503).send({
          error: 'anthropic_key_missing',
          message: 'Anthropic API key not configured on server',
          fallback: true,
        });
      }

      const run = async () => {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const json = await r.json();

        if (r.status === 429) {
          const ex = new Error('rate_limited');
          ex.status = 429;
          throw ex;
        }

        return { status: r.status, json };
      };

      try {
        const result = await withBackoff(run, 3);
        return reply.code(result.status).send(result.json);
      } catch (err) {
        if (err.status === 429) {
          // Mock fallback for quota issues
          return reply.send({
            id: 'mock-1',
            content: [
              {
                type: 'text',
                text: 'Demo fallback answer due to provider quota issues. Please check your Anthropic API key and billing.',
              },
            ],
            model: 'claude-3-5-sonnet-20241022',
            fallback: true,
          });
        }
        throw err;
      }
    }

    if (provider === 'ollama') {
      const base = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

      const run = async () => {
        // Try /api/chat first, fallback to /api/generate if needed
        let r = await fetch(`${base}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // If 404, try /api/generate
        if (r.status === 404) {
          r = await fetch(`${base}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        const json = await r.json();

        if (r.status === 404) {
          const ex = new Error('ollama_not_found');
          ex.status = 404;
          throw ex;
        }

        return { status: r.status, json };
      };

      try {
        const result = await withBackoff(run, 2);
        return reply.code(result.status).send(result.json);
      } catch (err) {
        if (err.message === 'ollama_not_found') {
          return reply.code(404).send({
            error: 'ollama_not_found',
            message:
              'Ollama server not found or not running. Check OLLAMA_URL environment variable.',
          });
        }
        throw err;
      }
    }

    return reply.code(400).send({
      error: 'unsupported_provider',
      message: `Provider "${provider}" not supported. Use: openai, anthropic, or ollama`,
    });
  } catch (err) {
    console.error('[aiTask] err', err.message || err);

    if (err.status === 429) {
      return reply.code(429).send({
        error: 'rate_limited',
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    return reply.code(500).send({
      error: 'ai_task_failed',
      message: err.message || String(err),
    });
  }
}



