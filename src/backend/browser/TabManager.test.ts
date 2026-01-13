/**
 * Tests for TabManager - Real WebView lifecycle management
 */

import { TabManager } from './TabManager';

describe('TabManager', () => {
  beforeEach(() => {
    // Mock Tauri
    (global as any).__TAURI__ = {
      invoke: jest.fn().mockResolvedValue('tab-id-123'),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Creation', () => {
    it('should create a new tab with URL', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue('tab-123');

      const tabId = await TabManager.createTab('https://example.com');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_create', {
        url: 'https://example.com',
        privacy_mode: 'normal',
        app_mode: 'Browse'
      });
      expect(tabId).toBe('tab-123');
    });

    it('should create a new tab with default URL', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue('tab-456');

      const _tabId = await TabManager.createTab();

      expect(mockInvoke).toHaveBeenCalledWith('tabs_create', {
        url: undefined,
        privacy_mode: 'normal',
        app_mode: 'Browse'
      });
    });
  });

  describe('Tab Operations', () => {
    it('should close a tab', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;

      await TabManager.closeTab('tab-123');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_close', {
        tab_id: 'tab-123'
      });
    });

    it('should switch to a tab', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;

      await TabManager.switchTab('tab-456');

      expect(mockInvoke).toHaveBeenCalledWith('tabs_switch', {
        tab_id: 'tab-456'
      });
    });
  });

  describe('Tab Queries', () => {
    it('should get tabs from Tauri', async () => {
      const mockTabs = [
        { id: 'tab-1', url: 'https://example.com', active: true },
        { id: 'tab-2', url: 'https://google.com', active: false }
      ];

      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue(mockTabs);

      const tabs = await TabManager.getTabs();

      expect(mockInvoke).toHaveBeenCalledWith('tabs_list');
      expect(tabs).toEqual(mockTabs);
    });

    it('should get active tab', async () => {
      const mockTabs = [
        { id: 'tab-1', url: 'https://example.com', active: false },
        { id: 'tab-2', url: 'https://google.com', active: true }
      ];

      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue(mockTabs);

      const activeTab = await TabManager.getActiveTab();

      expect(activeTab).toEqual(mockTabs[1]);
    });

    it('should return null when no active tab', async () => {
      const mockTabs = [
        { id: 'tab-1', url: 'https://example.com', active: false }
      ];

      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValue(mockTabs);

      const activeTab = await TabManager.getActiveTab();

      expect(activeTab).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle tab creation errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('Tab creation failed'));

      await expect(TabManager.createTab('https://example.com'))
        .rejects.toThrow('Tab creation failed');
    });

    it('should handle tab operation errors', async () => {
      const mockInvoke = (global as any).__TAURI__.invoke;
      mockInvoke.mockRejectedValue(new Error('Tab operation failed'));

      await expect(TabManager.closeTab('tab-123'))
        .rejects.toThrow('Tab operation failed');
    });
  });
});
