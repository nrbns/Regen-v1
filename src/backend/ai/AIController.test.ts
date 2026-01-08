/**
 * Tests for AIController - Real AI service integration
 */

import { AIController } from './AIController';

describe('AIController', () => {
  beforeEach(() => {
    // Reset controller state
    jest.clearAllMocks();

    // Mock Tauri
    (global as any).__TAURI__ = {
      invoke: jest.fn(),
    };
  });

  describe('Initialization', () => {
    it('should initialize successfully when AI is available', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue(undefined);

      await AIController.initialize();

      expect(mockInvoke).toHaveBeenCalledWith('ai_check_status');
      expect(AIController.isAvailable()).toBe(true);
    });

    it('should handle initialization failure gracefully', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('AI not available'));

      await AIController.initialize();

      expect(AIController.isAvailable()).toBe(false);
    });
  });

  describe('AI Task Execution', () => {
    beforeEach(async () => {
      // Initialize AI first
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // For initialization
      await AIController.initialize();
    });

    it('should execute AI tasks successfully', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue('AI response: This is a test analysis');

      const result = await AIController.runTask('Analyze this text');

      expect(mockInvoke).toHaveBeenCalledWith('ai_complete', {
        prompt: 'Analyze this text'
      });
      expect(result).toBe('AI response: This is a test analysis');
    });

    it('should reject tasks when AI is not initialized', async () => {
      // Mock AI as unavailable
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValueOnce(new Error('AI not available'));
      await AIController.initialize();

      await expect(AIController.runTask('Test task'))
        .rejects.toThrow('AI not initialized');
    });

    it('should handle AI execution errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('AI execution failed'));

      await expect(AIController.runTask('Test task'))
        .rejects.toThrow('AI execution failed');
    });
  });

  describe('Intent Detection', () => {
    it('should detect intent using AI when available', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // init
      mockInvoke.mockResolvedValueOnce('ai'); // intent detection

      await AIController.initialize();
      const intent = await AIController.detectIntent('What is AI?');

      expect(mockInvoke).toHaveBeenCalledWith('ai_detect_intent', {
        query: 'What is AI?'
      });
      expect(intent).toBe('ai');
    });

    it('should fallback to local intent detection when AI fails', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValueOnce(new Error('AI not available'));
      await AIController.initialize();

      const intent = await AIController.detectIntent('What is AI?');

      // Should use fallback logic
      expect(intent).toBe('ai');
    });
  });

  describe('Status Queries', () => {
    it('should report availability correctly', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // init success

      await AIController.initialize();
      expect(AIController.isAvailable()).toBe(true);

      // Test uninitialized state
      mockInvoke.mockRejectedValueOnce(new Error('No AI'));
      await AIController.initialize();
      expect(AIController.isAvailable()).toBe(false);
    });

    it('should report running status', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // init
      mockInvoke.mockResolvedValueOnce('response'); // task

      await AIController.initialize();

      expect(AIController.isRunning()).toBe(false);

      const taskPromise = AIController.runTask('test');
      expect(AIController.isRunning()).toBe(true);

      await taskPromise;
      expect(AIController.isRunning()).toBe(false);
    });
  });
});
