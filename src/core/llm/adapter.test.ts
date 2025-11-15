/**
 * LLM Adapter Tests - Unit tests with mocked fetch
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendPrompt, getAvailableProviders } from './adapter';

// Mock fetch globally
global.fetch = vi.fn();

describe('LLM Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete (import.meta as any).env.VITE_OPENAI_API_KEY;
    delete (import.meta as any).env.VITE_ANTHROPIC_API_KEY;
    delete (import.meta as any).env.VITE_MISTRAL_API_KEY;
    delete (import.meta as any).env.VITE_OLLAMA_BASE_URL;
  });

  describe('getAvailableProviders', () => {
    it('should return empty array when no API keys are set', () => {
      const providers = getAvailableProviders();
      expect(providers).toEqual([]);
    });

    it('should return OpenAI when API key is set', () => {
      (import.meta as any).env.VITE_OPENAI_API_KEY = 'test-key';
      const providers = getAvailableProviders();
      expect(providers).toContain('openai');
    });
  });

  describe('sendPrompt', () => {
    it('should throw error when no providers are configured', async () => {
      await expect(sendPrompt('test prompt')).rejects.toThrow();
    });

    it('should call OpenAI API when key is set', async () => {
      (import.meta as any).env.VITE_OPENAI_API_KEY = 'test-key';
      
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }],
        model: 'gpt-4o-mini',
        usage: { total_tokens: 100 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await sendPrompt('test prompt', { provider: 'openai' });
      
      expect(response.text).toBe('Test response');
      expect(response.provider).toBe('openai');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      (import.meta as any).env.VITE_OPENAI_API_KEY = 'test-key';
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      await expect(sendPrompt('test prompt', { provider: 'openai' })).rejects.toThrow();
    });

    it('should retry with fallback provider on error', async () => {
      (import.meta as any).env.VITE_OPENAI_API_KEY = 'test-key';
      (import.meta as any).env.VITE_ANTHROPIC_API_KEY = 'test-key-2';
      
      // OpenAI fails
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { message: 'Server error' } }),
      });

      // Anthropic succeeds
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Anthropic response' }],
          model: 'claude-3-5-sonnet-20241022',
          usage: { total_tokens: 150 },
        }),
      });

      const response = await sendPrompt('test prompt');
      
      expect(response.text).toBe('Anthropic response');
      expect(response.provider).toBe('anthropic');
    });
  });
});

