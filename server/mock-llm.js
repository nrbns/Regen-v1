/**
 * Mock LLM Server for Development with Streaming Support
 * Use when DEV=true to skip Ollama installation
 * Supports SSE streaming for real-time agent events
 */

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';

const mockLLM = Fastify({ logger: true });
await mockLLM.register(websocketPlugin);

// Mock research/summarization endpoint (non-streaming)
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

// Streaming agent endpoint (WebSocket) - Legacy endpoint
mockLLM.get('/api/agent/stream', { websocket: true }, (connection, _req) => {
  connection.socket.on('message', async message => {
    try {
      const data = JSON.parse(message.toString());
      const { type, payload } = data;

      if (type === 'start_agent') {
        const { query: agentQuery, url: agentUrl } = payload || {};

        // Emit start event
        connection.socket.send(
          JSON.stringify({
            type: 'agent_start',
            payload: { query: agentQuery || query, url: agentUrl || url },
          })
        );

        // Simulate streaming partial summaries
        const mockSummary = `[MOCK] Analyzing: ${agentQuery || query || 'No query'}\n\nThis is a mock streaming response. In production, this would stream from Ollama or OpenAI.`;
        const chunks = mockSummary.split(' ');

        for (let i = 0; i < chunks.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
          connection.socket.send(
            JSON.stringify({
              type: 'partial_summary',
              payload: { text: chunks[i] + ' ', chunk_index: i, total_chunks: chunks.length },
            })
          );
        }

        // Emit action suggestions
        connection.socket.send(
          JSON.stringify({
            type: 'action_suggestion',
            payload: {
              id: 'act_1',
              action_type: 'search',
              label: `Search: ${agentQuery || query}`,
              payload: { query: agentQuery || query },
              confidence: 0.85,
            },
          })
        );

        // Emit final summary
        connection.socket.send(
          JSON.stringify({
            type: 'final_summary',
            payload: {
              summary: {
                short: mockSummary.substring(0, 200),
                bullets: ['Mock bullet point 1', 'Mock bullet point 2'],
                keywords: ['mock', 'test', 'development'],
              },
              citations: 2,
              hallucination: 'low',
              confidence: 0.8,
            },
          })
        );

        // Emit end event
        connection.socket.send(
          JSON.stringify({
            type: 'agent_end',
            payload: { success: true },
          })
        );
      }
    } catch (error) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          payload: { message: error.message },
        })
      );
    }
  });
});

// HTTP streaming endpoint (for Tauri agent fallback - Ollama-like format)
mockLLM.post('/api/mock-llm/stream', async (request, reply) => {
  const { query, context } = request.body || {};

  reply.raw.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
  });

  // Simulate Ollama streaming format
  const mockText = `[MOCK LLM] Analyzing: "${query || 'No query'}"\n\n${context ? `Context: ${context.substring(0, 200)}...\n\n` : ''}This is a comprehensive mock streaming response. In production, this would stream from Ollama or OpenAI. The response includes detailed analysis and recommendations.`;
  const words = mockText.split(' ');

  // Stream in Ollama JSON format
  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const word = words[i] + (i < words.length - 1 ? ' ' : '');
    const chunk =
      JSON.stringify({
        model: 'mock-llm',
        created_at: new Date().toISOString(),
        response: word,
        done: i === words.length - 1,
      }) + '\n';
    reply.raw.write(chunk);
  }

  reply.raw.end();
});

// SSE endpoint for HTTP streaming
mockLLM.get('/api/agent/stream-sse', async (request, reply) => {
  const { query, url } = request.query || {};

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send start event
  reply.raw.write(`data: ${JSON.stringify({ type: 'agent_start', payload: { query, url } })}\n\n`);

  // Simulate streaming
  const mockText = `[MOCK] Streaming response for: ${query || 'No query'}\n\nThis demonstrates real-time streaming.`;
  const words = mockText.split(' ');

  for (let i = 0; i < words.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    reply.raw.write(
      `data: ${JSON.stringify({
        type: 'partial_summary',
        payload: { text: words[i] + ' ', chunk_index: i },
      })}\n\n`
    );
  }

  reply.raw.write(
    `data: ${JSON.stringify({
      type: 'final_summary',
      payload: { summary: { short: mockText.substring(0, 200) }, citations: 1 },
    })}\n\n`
  );

  reply.raw.end();
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

// WebSocket endpoint for real-time agent streaming (matches Tauri WebSocket format)
mockLLM.get('/api/agent/ws', { websocket: true }, (connection, _req) => {
  connection.socket.on('message', async message => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'start_agent') {
        const { query, url, context } = data;

        // Emit start event
        connection.socket.send(
          JSON.stringify({
            type: 'agent_start',
            payload: { query: query || 'No query', url: url || null },
          })
        );

        // Simulate streaming with realistic delay
        const mockSummary = `[MOCK LLM] Analyzing: "${query || 'No query'}"\n\n${context ? `Context provided: ${context.substring(0, 200)}...\n\n` : ''}This is a comprehensive analysis of the query. The mock LLM provides detailed insights and recommendations based on the input.`;
        const words = mockSummary.split(' ');

        // Stream words with realistic timing
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 30)); // 30ms per word = ~33 words/sec
          connection.socket.send(
            JSON.stringify({
              type: 'partial_summary',
              payload: {
                text: words[i] + (i < words.length - 1 ? ' ' : ''),
                chunk_index: Math.floor(i / 10), // Group into chunks
              },
            })
          );
        }

        // Emit action suggestions
        connection.socket.send(
          JSON.stringify({
            type: 'action_suggestion',
            payload: {
              id: 'act_mock_1',
              action_type: 'search',
              label: `Search for: ${query}`,
              payload: { query },
              confidence: 0.85,
            },
          })
        );

        // Emit final summary
        connection.socket.send(
          JSON.stringify({
            type: 'final_summary',
            payload: {
              summary: {
                short: mockSummary.substring(0, 200),
                bullets: ['Mock analysis point 1', 'Mock analysis point 2', 'Mock recommendation'],
                keywords: query ? query.split(' ').slice(0, 5) : ['mock', 'test'],
              },
              citations: 2,
              hallucination: 'low',
              confidence: 0.8,
            },
          })
        );

        // Emit end event
        connection.socket.send(
          JSON.stringify({
            type: 'agent_end',
            payload: { success: true },
          })
        );
      }
    } catch (error) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          payload: { message: error.message },
        })
      );
    }
  });
});

export async function startMockLLM(port = 4000) {
  try {
    await mockLLM.listen({ port, host: '0.0.0.0' });
    console.log(`[Mock LLM] Server running on http://localhost:${port}`);
    console.log(`[Mock LLM] WebSocket: ws://localhost:${port}/api/agent/ws`);
    console.log(`[Mock LLM] HTTP Stream: POST http://localhost:${port}/api/mock-llm/stream`);
    console.log(`[Mock LLM] SSE: http://localhost:${port}/api/agent/stream-sse`);
    return mockLLM;
  } catch (error) {
    console.error('[Mock LLM] Failed to start:', error);
    throw error;
  }
}

// Auto-start if DEV=true
if (process.env.DEV === 'true' || process.env.NODE_ENV === 'development') {
  const port = parseInt(process.env.MOCK_LLM_PORT || '4000', 10);
  startMockLLM(port).catch(console.error);
}
