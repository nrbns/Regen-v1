/**
 * Tests for IPC Events - Real-time communication layer
 */

import { IPCHandler, IPC_EVENTS } from './events';

describe('IPCHandler', () => {
  beforeEach(() => {
    // Reset any listeners
    jest.clearAllMocks();
  });

  describe('Event Registration', () => {
    it('should allow registering event listeners', () => {
      const mockCallback = jest.fn();
      const unsubscribe = IPCHandler.on(IPC_EVENTS.NEW_TAB, mockCallback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unregistering event listeners', () => {
      const mockCallback = jest.fn();
      const unsubscribe = IPCHandler.on(IPC_EVENTS.NEW_TAB, mockCallback);

      unsubscribe();
      // Should not crash when unregistering
    });
  });

  describe('IPC Methods', () => {
    beforeEach(() => {
      // Mock Tauri invoke
      (global as any).__TAURI__ = {
        invoke: jest.fn().mockResolvedValue('mock-result'),
      };
    });

    it('should expose navigation methods', () => {
      expect(typeof IPCHandler.navigate).toBe('function');
      expect(typeof IPCHandler.back).toBe('function');
      expect(typeof IPCHandler.forward).toBe('function');
      expect(typeof IPCHandler.reload).toBe('function');
    });

    it('should expose tab management methods', () => {
      expect(typeof IPCHandler.newTab).toBe('function');
      expect(typeof IPCHandler.closeTab).toBe('function');
      expect(typeof IPCHandler.switchTab).toBe('function');
    });

    it('should expose AI methods', () => {
      expect(typeof IPCHandler.runAI).toBe('function');
    });

    it('should expose download methods', () => {
      expect(typeof IPCHandler.download).toBe('function');
    });
  });

  describe('IPC Communication', () => {
    beforeEach(() => {
      (global as any).__TAURI__ = {
        invoke: jest.fn().mockResolvedValue('success'),
      };
    });

    it('should call Tauri invoke for navigation', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      await IPCHandler.navigate('tab-1', 'https://example.com');

      expect(mockInvoke).toHaveBeenCalledWith('navigate', {
        tabId: 'tab-1',
        url: 'https://example.com'
      });
    });

    it('should call Tauri invoke for new tab', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      await IPCHandler.newTab('https://example.com');

      expect(mockInvoke).toHaveBeenCalledWith('new_tab', {
        url: 'https://example.com'
      });
    });

    it('should call Tauri invoke for AI tasks', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      await IPCHandler.runAI('Analyze this text');

      expect(mockInvoke).toHaveBeenCalledWith('run_ai', {
        task: 'Analyze this text',
        context: undefined
      });
    });

    it('should handle IPC errors gracefully', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('IPC failed'));

      await expect(IPCHandler.navigate('tab-1', 'https://example.com'))
        .rejects.toThrow('IPC failed');
    });
  });
});
