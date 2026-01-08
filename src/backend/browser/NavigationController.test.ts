/**
 * Tests for NavigationController - URL handling and WebView navigation
 */

import { NavigationController } from './NavigationController';

describe('NavigationController', () => {
  beforeEach(() => {
    // Mock Tauri
    (global as any).__TAURI__ = {
      invoke: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation', () => {
    it('should navigate to a URL', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;

      await NavigationController.navigate('tab-123', 'https://example.com');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_navigate', {
        tab_id: 'tab-123',
        url: 'https://example.com'
      });
    });

    it('should handle navigation errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('Navigation failed'));

      await expect(NavigationController.navigate('tab-123', 'https://example.com'))
        .rejects.toThrow('Navigation failed');
    });
  });

  describe('Browser Controls', () => {
    it('should go back', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;

      await NavigationController.back('tab-123');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_back', {
        tab_id: 'tab-123'
      });
    });

    it('should go forward', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;

      await NavigationController.forward('tab-123');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_forward', {
        tab_id: 'tab-123'
      });
    });

    it('should reload', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;

      await NavigationController.reload('tab-123');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_reload', {
        tab_id: 'tab-123'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle back navigation errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('Back navigation failed'));

      await expect(NavigationController.back('tab-123'))
        .rejects.toThrow('Back navigation failed');
    });

    it('should handle forward navigation errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('Forward navigation failed'));

      await expect(NavigationController.forward('tab-123'))
        .rejects.toThrow('Forward navigation failed');
    });

    it('should handle reload errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('Reload failed'));

      await expect(NavigationController.reload('tab-123'))
        .rejects.toThrow('Reload failed');
    });
  });
});
