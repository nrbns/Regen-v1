/**
 * Local-First Privacy Controls
 * Brave-like trust + Arc-like UX + AI agent like Rewind/Cursor
 */
class TrustControls {
    trustRecords = new Map();
    defaultPolicy = {
        allowTracking: false,
        allowCookies: true,
        allowThirdPartyCookies: false,
        blockAds: true,
        blockTrackers: true,
        blockFingerprinting: true,
        allowLocation: false,
        allowNotifications: false,
        allowCamera: false,
        allowMicrophone: false,
    };
    /**
     * Get trust level for domain
     */
    getTrustLevel(domain) {
        const record = this.trustRecords.get(domain);
        if (!record) {
            return 'neutral';
        }
        return record.trustLevel;
    }
    /**
     * Set trust level for domain
     */
    setTrustLevel(domain, level) {
        const existing = this.trustRecords.get(domain);
        const record = {
            domain,
            trustLevel: level,
            lastUpdated: Date.now(),
            visitCount: (existing?.visitCount || 0) + 1,
            privacyScore: this.calculatePrivacyScore(level),
            violations: existing?.violations || [],
        };
        this.trustRecords.set(domain, record);
        this.saveToStorage();
    }
    /**
     * Get privacy policy for domain
     */
    getPrivacyPolicy(domain) {
        const trustLevel = this.getTrustLevel(domain);
        const policy = { ...this.defaultPolicy };
        // Adjust policy based on trust level
        if (trustLevel === 'trusted') {
            policy.allowTracking = true;
            policy.allowThirdPartyCookies = true;
            policy.blockAds = false;
            policy.blockTrackers = false;
        }
        else if (trustLevel === 'untrusted' || trustLevel === 'blocked') {
            policy.allowTracking = false;
            policy.allowThirdPartyCookies = false;
            policy.blockAds = true;
            policy.blockTrackers = true;
            policy.blockFingerprinting = true;
        }
        return policy;
    }
    /**
     * Audit privacy for domain
     */
    async auditPrivacy(domain) {
        // Use Tauri backend for privacy audit
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('privacy_audit', { domain });
                return result;
            }
            catch (error) {
                console.error('[TrustControls] Audit failed:', error);
            }
        }
        // Fallback: basic audit
        return {
            domain,
            timestamp: Date.now(),
            trackers: [],
            cookies: 0,
            thirdPartyRequests: 0,
            privacyScore: 50,
            recommendations: ['Enable tracker blocking', 'Block third-party cookies'],
        };
    }
    /**
     * Record privacy violation
     */
    recordViolation(domain, violation) {
        const record = this.trustRecords.get(domain);
        if (record) {
            if (!record.violations.includes(violation)) {
                record.violations.push(violation);
                record.privacyScore = Math.max(0, record.privacyScore - 10);
                record.trustLevel = this.updateTrustLevelFromScore(record.privacyScore);
                this.trustRecords.set(domain, record);
                this.saveToStorage();
            }
        }
        else {
            // Create new record
            const newRecord = {
                domain,
                trustLevel: 'untrusted',
                lastUpdated: Date.now(),
                visitCount: 1,
                privacyScore: 40,
                violations: [violation],
            };
            this.trustRecords.set(domain, newRecord);
            this.saveToStorage();
        }
    }
    /**
     * Calculate privacy score from trust level
     */
    calculatePrivacyScore(level) {
        switch (level) {
            case 'trusted':
                return 90;
            case 'neutral':
                return 50;
            case 'untrusted':
                return 30;
            case 'blocked':
                return 0;
            default:
                return 50;
        }
    }
    /**
     * Update trust level from privacy score
     */
    updateTrustLevelFromScore(score) {
        if (score >= 80)
            return 'trusted';
        if (score >= 50)
            return 'neutral';
        if (score >= 20)
            return 'untrusted';
        return 'blocked';
    }
    /**
     * Get all trust records
     */
    getAllRecords() {
        return Array.from(this.trustRecords.values());
    }
    /**
     * Clear trust records
     */
    clearRecords() {
        this.trustRecords.clear();
        this.saveToStorage();
    }
    /**
     * Save to storage
     */
    saveToStorage() {
        if (typeof window === 'undefined')
            return;
        try {
            const records = Array.from(this.trustRecords.entries());
            localStorage.setItem('regen:trust-records', JSON.stringify(records));
        }
        catch (error) {
            console.error('[TrustControls] Failed to save to storage:', error);
        }
    }
    /**
     * Load from storage
     */
    loadFromStorage() {
        if (typeof window === 'undefined')
            return;
        try {
            const stored = localStorage.getItem('regen:trust-records');
            if (stored) {
                const records = JSON.parse(stored);
                this.trustRecords = new Map(records);
            }
        }
        catch (error) {
            console.error('[TrustControls] Failed to load from storage:', error);
        }
    }
    /**
     * Get privacy recommendations
     */
    getRecommendations(domain) {
        const audit = this.auditPrivacy(domain);
        const recommendations = [];
        // Add recommendations based on audit
        audit.then(result => {
            if (result.trackers.length > 0) {
                recommendations.push('Enable tracker blocking');
            }
            if (result.thirdPartyRequests > 10) {
                recommendations.push('Block third-party requests');
            }
            if (result.cookies > 20) {
                recommendations.push('Clear cookies regularly');
            }
        });
        return recommendations;
    }
}
// Singleton instance
const trustControls = new TrustControls();
// Load from storage on init
if (typeof window !== 'undefined') {
    trustControls.loadFromStorage();
}
export { trustControls };
