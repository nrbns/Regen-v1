import { systemState } from '../state/SystemState';

export class TabManager {
  static createTab(url: string = ''): string {
    // IMMEDIATE: Update SystemState first (single source of truth)
    const tabId = systemState.addTab(url || 'regen://home', 'New Tab');

    // ASYNC: Try to create actual WebView in backend
    // This may fail, but UI will already show the tab
    try {
      // In real implementation, this would be:
      // IPCHandler.send('tab-created', { tabId, url });
      // And the Rust backend would create the actual WebView
      console.log(`[TabManager] Tab ${tabId} created with URL: ${url}`);
    } catch (error) {
      console.error('[TabManager] Failed to create backend tab:', error);
      // Even if backend fails, UI still shows tab (graceful degradation)
    }

    return tabId;
  }

  static closeTab(tabId: string) {
    // IMMEDIATE: Update SystemState first
    systemState.removeTab(tabId);

    // ASYNC: Try to close actual WebView in backend
    try {
      console.log(`[TabManager] Tab ${tabId} closed`);
      // In real implementation: IPCHandler.send('tab-closed', { tabId });
    } catch (error) {
      console.error('[TabManager] Failed to close backend tab:', error);
      // UI still removes tab even if backend fails
    }
  }

  static switchTab(tabId: string) {
    // IMMEDIATE: Update SystemState first
    systemState.switchTab(tabId);

    // ASYNC: Try to switch actual WebView in backend
    try {
      console.log(`[TabManager] Switched to tab ${tabId}`);
      // In real implementation: IPCHandler.send('tab-switched', { tabId });
    } catch (error) {
      console.error('[TabManager] Failed to switch backend tab:', error);
      // UI still switches even if backend fails
    }
  }

  static async getTabs() {
    try {
      // Get tabs from Tauri
      const tabs = await (window as any).__TAURI__.invoke('tabs_list');
      return tabs;
    } catch (error) {
      console.error('[TabManager] Failed to get tabs:', error);
      // Fallback to local state
      return systemState.getState().tabs;
    }
  }

  static async getActiveTab() {
    try {
      const tabs = await this.getTabs();
      return tabs.find((tab: any) => tab.active) || null;
    } catch (error) {
      console.error('[TabManager] Failed to get active tab:', error);
      return null;
    }
  }
}
