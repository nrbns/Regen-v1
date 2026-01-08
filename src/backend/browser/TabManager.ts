import { systemState } from '../state/SystemState';

export class TabManager {
  static createTab(url: string = ''): string {
    return systemState.addTab(url);
  }

  static closeTab(tabId: string) {
    // In a real implementation, this would destroy the WebView
    // For now, just update state
    systemState.removeTab(tabId);
  }

  static switchTab(tabId: string) {
    systemState.switchTab(tabId);
  }

  static getTabs() {
    return systemState.getState().tabs;
  }

  static getActiveTab() {
    const state = systemState.getState();
    return state.tabs.find(tab => tab.id === state.activeTabId) || null;
  }
}
