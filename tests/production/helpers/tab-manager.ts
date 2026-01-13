/**
 * Tab Manager test helpers
 */

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  createdAt: number;
}

export class TabTestHelper {
  private tabs: TabInfo[] = [];

  async createTab(url: string): Promise<TabInfo> {
    const tab: TabInfo = {
      id: `tab-${Date.now()}-${Math.random()}`,
      url,
      title: new URL(url).hostname || 'New Tab',
      createdAt: Date.now(),
    };
    this.tabs.push(tab);
    return tab;
  }

  async createMultipleTabs(urls: string[]): Promise<TabInfo[]> {
    const tabs: TabInfo[] = [];
    for (const url of urls) {
      tabs.push(await this.createTab(url));
    }
    return tabs;
  }

  async closeTab(tabId: string): Promise<void> {
    this.tabs = this.tabs.filter(t => t.id !== tabId);
  }

  async closeAllTabs(): Promise<void> {
    this.tabs = [];
  }

  getTabs(): TabInfo[] {
    return [...this.tabs];
  }

  getTabCount(): number {
    return this.tabs.length;
  }

  async switchTab(tabId: string): Promise<void> {
    // Simulate tab switch
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
