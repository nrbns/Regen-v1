/**
 * Sync Cloud - Feature #7
 * Basic bookmark/history/settings sync
 */
export declare class SyncService {
    private static syncEndpoint;
    private static isEnabled;
    private static syncInterval;
    static enable(userId: string, token: string): void;
    static disable(): void;
    static sync(userId: string, token: string): Promise<boolean>;
    private static getLocalBookmarks;
    private static getLocalHistory;
    private static getLocalSettings;
    private static mergeRemoteData;
    private static startAutoSync;
}
