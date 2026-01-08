/**
 * Integration Tests - End-to-end real-time architecture validation
 */

import { systemState } from './state/SystemState';
import { TabManager } from './browser/TabManager';
import { NavigationController } from './browser/NavigationController';
import { AIController } from './ai/AIController';
import { IPCHandler, IPC_EVENTS } from './ipc/events';

describe('Real-time Architecture Integration', () => {
  beforeEach(() => {
    // Reset system state
    jest.clearAllMocks();

    // Mock Tauri IPC
    (global as any).__TAURI__ = {
      invoke: jest.fn(),
    };
  });

  describe('Tab Lifecycle Integration', () => {
    it('should create tab and update system state', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue('tab-123');

      const tabId = await TabManager.createTab('https://example.com');

      expect(tabId).toBe('tab-123');
      expect(systemState.getState().tabs).toHaveLength(1);
      expect(systemState.getState().tabs[0].url).toBe('https://example.com');
    });

    it('should navigate and update tab state', async () => {
      // Setup: Create tab
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce('tab-123'); // create
      mockInvoke.mockResolvedValueOnce(undefined); // navigate

      await TabManager.createTab();
      await NavigationController.navigate('tab-123', 'https://google.com');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_navigate', {
        tab_id: 'tab-123',
        url: 'https://google.com'
      });
    });
  });

  describe('IPC Event Flow', () => {
    it('should handle complete navigation flow via IPC', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue('tab-123');

      // Simulate UI calling IPC
      await IPCHandler.newTab('https://example.com');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_create', {
        url: 'https://example.com',
        privacy_mode: 'normal',
        app_mode: 'Browse'
      });
    });

    it('should handle AI task flow via IPC', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // init
      mockInvoke.mockResolvedValueOnce('AI analysis complete'); // task

      await AIController.initialize();
      await IPCHandler.runAI('Analyze this text');

      expect(mockInvoke).toHaveBeenCalledWith('ai_complete', {
        prompt: 'Analyze this text'
      });
    });
  });

  describe('System State Consistency', () => {
    it('should maintain consistent state across operations', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue('tab-123');

      // Create tab
      await TabManager.createTab('https://example.com');
      expect(systemState.getState().tabs).toHaveLength(1);

      // Close tab
      mockInvoke.mockResolvedValueOnce(undefined); // close
      await TabManager.closeTab('tab-123');
      expect(systemState.getState().tabs).toHaveLength(0);
    });

    it('should update status during AI operations', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce(undefined); // init
      mockInvoke.mockResolvedValueOnce('AI response'); // task

      await AIController.initialize();

      expect(systemState.getState().status).toBe('idle');

      const taskPromise = AIController.runTask('test task');
      expect(systemState.getState().status).toBe('working');

      await taskPromise;
      expect(systemState.getState().status).toBe('idle');
    });
  });

  describe('Error Isolation', () => {
    it('should isolate AI failures from browser operation', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValueOnce(new Error('AI failed'));
      await AIController.initialize();

      // AI should fail
      await expect(AIController.runTask('test')).rejects.toThrow();

      // But browser operations should still work
      mockInvoke.mockResolvedValueOnce('tab-123');
      const tabId = await TabManager.createTab();
      expect(tabId).toBe('tab-123');
    });

    it('should handle IPC communication failures gracefully', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('IPC failed'));

      await expect(TabManager.createTab()).rejects.toThrow('IPC failed');
      await expect(NavigationController.navigate('tab-1', 'url')).rejects.toThrow('IPC failed');
    });
  });

  describe('Real-time State Synchronization', () => {
    it('should emit state change events', (done) => {
      systemState.once('state-changed', (newState, oldState) => {
        expect(newState.tabs).toHaveLength(1);
        expect(oldState.tabs).toHaveLength(0);
        done();
      });

      // Trigger state change
      systemState.addTab('https://example.com');
    });

    it('should allow UI components to subscribe to state changes', () => {
      const mockCallback = jest.fn();
      const unsubscribe = systemState.on('state-changed', mockCallback);

      systemState.addTab('https://example.com');

      expect(mockCallback).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      unsubscribe(); // Cleanup
    });
  });
});
