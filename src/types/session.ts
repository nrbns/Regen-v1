export interface BrowserSession {
  id: string;
  name: string;
  profileId: string;
  createdAt: number;
  tabCount: number;
  activeTabId?: string;
  color?: string;
}

