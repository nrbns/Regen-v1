/**
 * Local-First Privacy Controls
 * Brave-like trust + Arc-like UX + AI agent like Rewind/Cursor
 */
export type TrustLevel = 'trusted' | 'neutral' | 'untrusted' | 'blocked';
export interface PrivacyPolicy {
    allowTracking: boolean;
    allowCookies: boolean;
    allowThirdPartyCookies: boolean;
    blockAds: boolean;
    blockTrackers: boolean;
    blockFingerprinting: boolean;
    allowLocation: boolean;
    allowNotifications: boolean;
    allowCamera: boolean;
    allowMicrophone: boolean;
}
export interface TrustRecord {
    domain: string;
    trustLevel: TrustLevel;
    lastUpdated: number;
    visitCount: number;
    privacyScore: number;
    violations: string[];
    metadata?: Record<string, unknown>;
}
export interface PrivacyAudit {
    domain: string;
    timestamp: number;
    trackers: Array<{
        name: string;
        category: string;
        blocked: boolean;
    }>;
    cookies: number;
    thirdPartyRequests: number;
    privacyScore: number;
    recommendations: string[];
}
declare class TrustControls {
    private trustRecords;
    private defaultPolicy;
    /**
     * Get trust level for domain
     */
    getTrustLevel(domain: string): TrustLevel;
    /**
     * Set trust level for domain
     */
    setTrustLevel(domain: string, level: TrustLevel): void;
    /**
     * Get privacy policy for domain
     */
    getPrivacyPolicy(domain: string): PrivacyPolicy;
    /**
     * Audit privacy for domain
     */
    auditPrivacy(domain: string): Promise<PrivacyAudit>;
    /**
     * Record privacy violation
     */
    recordViolation(domain: string, violation: string): void;
    /**
     * Calculate privacy score from trust level
     */
    private calculatePrivacyScore;
    /**
     * Update trust level from privacy score
     */
    private updateTrustLevelFromScore;
    /**
     * Get all trust records
     */
    getAllRecords(): TrustRecord[];
    /**
     * Clear trust records
     */
    clearRecords(): void;
    /**
     * Save to storage
     */
    private saveToStorage;
    /**
     * Load from storage
     */
    loadFromStorage(): void;
    /**
     * Get privacy recommendations
     */
    getRecommendations(domain: string): string[];
}
declare const trustControls: TrustControls;
export { trustControls };
