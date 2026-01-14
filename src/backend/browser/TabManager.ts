import { systemState } from '../state/SystemState';

export class TabManager {
  static async createTab(url?: string): Promise<string> {
    try {
      const tabId = await (globalThis as any).__TAURI__?.invoke('tabs_create', {
        url,
        privacy_mode: 'normal',
        app_mode: 'Browse',
      });
      systemState.addTab(url || '', tabId);
      return tabId;
    } catch (error) {
      throw error;
    }
  }

  static async closeTab(tabId: string) {
    try {
      const result = await (globalThis as any).__TAURI__?.invoke('tabs_close', { tab_id: tabId });
      systemState.removeTab(tabId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async switchTab(tabId: string) {
    try {
      const result = await (globalThis as any).__TAURI__?.invoke('tabs_switch', { tab_id: tabId });
      systemState.switchTab(tabId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getTabs() {
    try {
      return await (window as any).__TAURI__.invoke('tabs_list');
    } catch (error) {
      console.error('[TabManager] Failed to get tabs:', error);
      throw error;
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
