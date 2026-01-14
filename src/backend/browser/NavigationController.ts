export class NavigationController {
  static async navigate(tabId: string, url: string) {
    try {
      return await (globalThis as any).__TAURI__?.invoke('tabs_navigate', { tab_id: tabId, url });
    } catch (error) {
      throw error;
    }
  }

  static async back(tabId: string) {
    try {
      return await (globalThis as any).__TAURI__?.invoke('tabs_back', { tab_id: tabId });
    } catch (error) {
      throw error;
    }
  }

  static async forward(tabId: string) {
    try {
      return await (globalThis as any).__TAURI__?.invoke('tabs_forward', { tab_id: tabId });
    } catch (error) {
      throw error;
    }
  }

  static async reload(tabId: string) {
    try {
      return await (globalThis as any).__TAURI__?.invoke('tabs_reload', { tab_id: tabId });
    } catch (error) {
      throw error;
    }
  }
}
