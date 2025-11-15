/**
 * Hugging Face Integration Tests
 * E2E tests for Hugging Face API integration
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

test.describe('Hugging Face Integration', () => {
  test('should check Hugging Face status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/huggingface/status`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('available');
    expect(data).toHaveProperty('has_api_key');
    
    if (data.has_api_key) {
      console.log('✅ Hugging Face API key is configured');
    } else {
      console.warn('⚠️  Hugging Face API key not found');
    }
  });

  test('should generate embeddings', async ({ request }) => {
    const response = await request.post(`${API_BASE}/huggingface/embedding`, {
      data: {
        text: 'This is a test sentence for embedding generation.',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
      },
    });

    if (response.status() === 503) {
      const data = await response.json();
      console.warn(`⚠️  Embedding service unavailable: ${data.detail}`);
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('embedding');
    expect(data).toHaveProperty('dimensions');
    expect(data.dimensions).toBe(384);
    expect(Array.isArray(data.embedding)).toBeTruthy();
    expect(data.embedding.length).toBe(384);
    
    console.log(`✅ Generated embedding with ${data.dimensions} dimensions`);
  });

  test('should generate batch embeddings', async ({ request }) => {
    const response = await request.post(`${API_BASE}/huggingface/embedding/batch`, {
      data: {
        texts: [
          'First test sentence.',
          'Second test sentence.',
          'Third test sentence.',
        ],
        model: 'sentence-transformers/all-MiniLM-L6-v2',
      },
    });

    if (response.status() === 503) {
      const data = await response.json();
      console.warn(`⚠️  Batch embedding service unavailable: ${data.detail}`);
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('embeddings');
    expect(data).toHaveProperty('count');
    expect(data.count).toBe(3);
    expect(Array.isArray(data.embeddings)).toBeTruthy();
    expect(data.embeddings.length).toBe(3);
    
    console.log(`✅ Generated ${data.count} embeddings`);
  });

  test('should stream chat completion', async ({ request }) => {
    const response = await request.post(`${API_BASE}/huggingface/chat`, {
      data: {
        messages: [
          { role: 'user', content: 'Say "Hello from Hugging Face!" in one sentence.' }
        ],
        model: 'meta-llama/Meta-Llama-3-8B-Instruct',
        temperature: 0.7,
        max_tokens: 50,
        stream: true,
      },
    });

    if (response.status() === 503) {
      const data = await response.json();
      console.warn(`⚠️  Chat service unavailable: ${data.detail}`);
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    
    const text = await response.text();
    expect(text).toContain('data:');
    expect(text).toContain('type');
    
    // Check for at least one token
    const lines = text.split('\n\n');
    let hasToken = false;
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token' && data.text) {
            hasToken = true;
            break;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    expect(hasToken).toBeTruthy();
    console.log('✅ Chat completion streaming works');
  });

  test('should check Redix status with Hugging Face', async ({ request }) => {
    const response = await request.get(`${API_BASE}/redix/status`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('ready');
    expect(data).toHaveProperty('backend');
    
    console.log(`✅ Redix status: ${data.backend} (ready: ${data.ready})`);
    
    if (data.huggingface || data.hf_available) {
      console.log('✅ Hugging Face is available for Redix');
    }
  });

  test('should use Hugging Face for Redix /ask', async ({ request }) => {
    const response = await request.post(`${API_BASE}/redix/ask`, {
      data: {
        prompt: 'What is 2+2? Answer in one sentence.',
        stream: true,
      },
    });

    expect(response.ok()).toBeTruthy();
    
    const text = await response.text();
    expect(text).toContain('data:');
    
    // Check for streaming tokens
    const lines = text.split('\n\n');
    let hasToken = false;
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token' && data.text) {
            hasToken = true;
            break;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    expect(hasToken).toBeTruthy();
    console.log('✅ Redix /ask streaming works');
  });
});

