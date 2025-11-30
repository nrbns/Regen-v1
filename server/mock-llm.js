/**
 * Mock LLM Server for Development
 * Use when DEV=true to skip Ollama installation
 */

import Fastify from 'fastify';

const mockLLM = Fastify({ logger: true });

// Mock research/summarization endpoint
mockLLM.post('/api/research', async (request, _reply) => {
  const { query } = request.body || {};

  return {
    summary: `[MOCK] Summary for: ${query || 'No query provided'}`,
    sources: [
      { title: 'Source 1', url: 'https://example.com/1', snippet: 'Mock snippet 1' },
      { title: 'Source 2', url: 'https://example.com/2', snippet: 'Mock snippet 2' },
    ],
    citations: 2,
    hallucination: 'low',
  };
});

// Mock chat endpoint
mockLLM.post('/api/chat', async (request, _reply) => {
  const { message } = request.body || {};

  return {
    response: `[MOCK] This is a mock response to: "${message || 'No message'}"\n\nIn production, this would be handled by Ollama or your AI provider.`,
    model: 'mock-llm',
    tokens: 50,
  };
});

// Mock vision endpoint
mockLLM.post('/api/ai/vision', async (request, _reply) => {
  const { image: _image, prompt } = request.body || {};

  return {
    analysis: `[MOCK] Vision analysis for: "${prompt || 'No prompt'}"\n\nThe image appears to contain text, charts, or UI elements. In production, this would use GPT-4o Vision.`,
    model: 'mock-vision',
  };
});

// Health check
mockLLM.get('/api/ping', async () => {
  return { status: 'ok', mode: 'mock-llm', message: 'Mock LLM server running' };
});

export async function startMockLLM(port = 4001) {
  try {
    await mockLLM.listen({ port, host: '0.0.0.0' });
    console.log(`[Mock LLM] Server running on http://localhost:${port}`);
    return mockLLM;
  } catch (error) {
    console.error('[Mock LLM] Failed to start:', error);
    throw error;
  }
}

// Auto-start if DEV=true
if (process.env.DEV === 'true' || process.env.NODE_ENV === 'development') {
  const port = parseInt(process.env.MOCK_LLM_PORT || '4001', 10);
  startMockLLM(port).catch(console.error);
}
