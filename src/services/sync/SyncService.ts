/**
 * Sync Cloud - Feature #7
 * Basic bookmark/history/settings sync
 */

interface SyncData {
  bookmarks: any[];
  history: any[];
  settings: Record<string, any>;
  lastSync: number;
}

export class SyncService {
  private static syncEndpoint = 'https://api.regenbrowser.com/sync'; // Replace with your endpoint
  private static isEnabled = false;
  private static syncInterval: NodeJS.Timeout | null = null;

  static enable(userId: string, token: string) {
    this.isEnabled = true;
    this.startAutoSync(userId, token);
  }

  static disable() {
    this.isEnabled = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  static async sync(userId: string, token: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // Get local data
      const bookmarks = this.getLocalBookmarks();
      const history = this.getLocalHistory();
      const settings = this.getLocalSettings();

      const data: SyncData = {
        bookmarks,
        history: history.slice(0, 1000), // Limit history
        settings,
        lastSync: Date.now(),
      };

      // Upload to server
      const response = await fetch(`${this.syncEndpoint}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, data }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      // Download remote changes
      const remoteResponse = await fetch(`${this.syncEndpoint}/download?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (remoteResponse.ok) {
        const remoteData: SyncData = await remoteResponse.json();
        this.mergeRemoteData(remoteData);
      }

      localStorage.setItem('regen-last-sync', Date.now().toString());
      return true;
    } catch (error) {
      console.error('[Sync] Failed:', error);
      return false;
    }
  }

  private static getLocalBookmarks(): any[] {
    const saved = localStorage.getItem('regen-bookmarks');
    return saved ? JSON.parse(saved) : [];
  }

  private static getLocalHistory(): any[] {
    const saved = localStorage.getItem('regen-history');
    return saved ? JSON.parse(saved) : [];
  }

  private static getLocalSettings(): Record<string, any> {
    const saved = localStorage.getItem('regen-settings');
    return saved ? JSON.parse(saved) : {};
  }

  private static mergeRemoteData(remote: SyncData) {
    // Merge bookmarks
    const localBookmarks = this.getLocalBookmarks();
    const mergedBookmarks = [...localBookmarks];
    
    remote.bookmarks.forEach(remoteBookmark => {
      if (!mergedBookmarks.find(b => b.id === remoteBookmark.id)) {
        mergedBookmarks.push(remoteBookmark);
      }
    });

    localStorage.setItem('regen-bookmarks', JSON.stringify(mergedBookmarks));

    // Merge settings (remote takes precedence)
    const localSettings = this.getLocalSettings();
    const mergedSettings = { ...localSettings, ...remote.settings };
    localStorage.setItem('regen-settings', JSON.stringify(mergedSettings));
  }

  private static startAutoSync(userId: string, token: string) {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.sync(userId, token);
    }, 5 * 60 * 1000);

    // Initial sync
    this.sync(userId, token);
  }
}

