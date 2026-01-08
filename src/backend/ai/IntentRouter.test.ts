/**
 * Tests for IntentRouter - Smart input classification
 */

import { IntentRouter } from './IntentRouter';
import { AIController } from './AIController';

describe('IntentRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL Detection', () => {
    it('should detect HTTP URLs', async () => {
      const result = await IntentRouter.route('https://example.com');

      expect(result.type).toBe('navigate');
      expect(result.input).toBe('https://example.com');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect HTTPS URLs', async () => {
      const result = await IntentRouter.route('http://google.com');

      expect(result.type).toBe('navigate');
      expect(result.input).toBe('http://google.com');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect URLs without protocol', async () => {
      const result = await IntentRouter.route('github.com/user/repo');

      expect(result.type).toBe('navigate');
      expect(result.input).toBe('github.com/user/repo');
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('Question Detection', () => {
    it('should detect questions with question marks', async () => {
      const result = await IntentRouter.route('What is the weather today?');

      expect(result.type).toBe('ai');
      expect(result.input).toBe('What is the weather today?');
    });

    it('should detect questions starting with question words', async () => {
      const questions = [
        'Why is the sky blue?',
        'How does AI work?',
        'When was Python created?',
        'Where is the Eiffel Tower?',
        'Who invented the telephone?'
      ];

      for (const question of questions) {
        const result = await IntentRouter.route(question);
        expect(result.type).toBe('ai');
        expect(result.confidence).toBe(0.8); // Fallback confidence
      }
    });
  });

  describe('Command Detection', () => {
    it('should detect analysis commands', async () => {
      const commands = [
        'analyze this text',
        'summarize the article',
        'explain the code',
        'tell me about machine learning'
      ];

      for (const command of commands) {
        const result = await IntentRouter.route(command);
        expect(result.type).toBe('ai');
      }
    });

    it('should detect navigation commands', async () => {
      const commands = [
        'go to google',
        'open youtube',
        'visit facebook'
      ];

      for (const command of commands) {
        const result = await IntentRouter.route(command);
        expect(result.type).toBe('ai'); // Commands get AI treatment first
      }
    });
  });

  describe('Search Fallback', () => {
    it('should default to search for unrecognized input', async () => {
      const result = await IntentRouter.route('random search query');

      expect(result.type).toBe('search');
      expect(result.input).toBe('random search query');
      expect(result.confidence).toBe(0.7);
    });

    it('should handle empty input', async () => {
      const result = await IntentRouter.route('');

      expect(result.type).toBe('search');
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('AI-Powered Intent Detection', () => {
    beforeEach(() => {
      // Mock Tauri for AI availability
      (global as any).__TAURI__ = {
        invoke: jest.fn(),
      };
    });

    it('should use AI for intent detection when available', async () => {
      // Mock AI initialization
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // init
      mockInvoke.mockResolvedValueOnce('search'); // intent detection

      await AIController.initialize();

      const result = await IntentRouter.route('search for cats');

      expect(mockInvoke).toHaveBeenCalledWith('ai_detect_intent', {
        query: 'search for cats'
      });
      expect(result.type).toBe('search');
      expect(result.confidence).toBe(0.95); // AI confidence
    });

    it('should fallback when AI intent detection fails', async () => {
      // Mock AI failure
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValueOnce(new Error('AI failed'));
      await AIController.initialize();

      const result = await IntentRouter.route('What is AI?');

      // Should use fallback logic
      expect(result.type).toBe('ai');
      expect(result.confidence).toBe(0.8); // Fallback confidence
    });
  });

  describe('Context Awareness', () => {
    it('should consider current URL context', async () => {
      const result = await IntentRouter.route('summarize this page', {
        currentUrl: 'https://example.com/article'
      });

      expect(result.type).toBe('ai');
      expect(result.input).toBe('summarize this page');
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with query parameters', async () => {
      const result = await IntentRouter.route('https://google.com/search?q=ai');

      expect(result.type).toBe('navigate');
    });

    it('should handle mixed input with URLs and questions', async () => {
      // URLs take precedence
      const result = await IntentRouter.route('What is https://example.com?');

      expect(result.type).toBe('navigate');
      expect(result.input).toBe('What is https://example.com?');
    });

    it('should handle very short input', async () => {
      const result = await IntentRouter.route('hi');

      expect(result.type).toBe('search');
      expect(result.confidence).toBe(0.7);
    });
  });
});
