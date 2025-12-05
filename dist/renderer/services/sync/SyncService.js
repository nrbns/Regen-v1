/**
 * Sync Cloud - Feature #7
 * Basic bookmark/history/settings sync
 */
export class SyncService {
    static syncEndpoint = 'https://api.regenbrowser.com/sync'; // Replace with your endpoint
    static isEnabled = false;
    static syncInterval = null;
    static enable(userId, token) {
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
    static async sync(userId, token) {
        if (!this.isEnabled)
            return false;
        try {
            // Get local data
            const bookmarks = this.getLocalBookmarks();
            const history = this.getLocalHistory();
            const settings = this.getLocalSettings();
            const data = {
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
                const remoteData = await remoteResponse.json();
                this.mergeRemoteData(remoteData);
            }
            localStorage.setItem('regen-last-sync', Date.now().toString());
            return true;
        }
        catch (error) {
            console.error('[Sync] Failed:', error);
            return false;
        }
    }
    static getLocalBookmarks() {
        const saved = localStorage.getItem('regen-bookmarks');
        return saved ? JSON.parse(saved) : [];
    }
    static getLocalHistory() {
        const saved = localStorage.getItem('regen-history');
        return saved ? JSON.parse(saved) : [];
    }
    static getLocalSettings() {
        const saved = localStorage.getItem('regen-settings');
        return saved ? JSON.parse(saved) : {};
    }
    static mergeRemoteData(remote) {
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
    static startAutoSync(userId, token) {
        // Sync every 5 minutes
        this.syncInterval = setInterval(() => {
            this.sync(userId, token);
        }, 5 * 60 * 1000);
        // Initial sync
        this.sync(userId, token);
    }
}
