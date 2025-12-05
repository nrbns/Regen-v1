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
  privacyScore: number; // 0-100
  violations: string[];
  metadata?: Record<string, unknown>;
}

export interface PrivacyAudit {
  domain: string;
  timestamp: number;
  trackers: Array<{ name: string; category: string; blocked: boolean }>;
  cookies: number;
  thirdPartyRequests: number;
  privacyScore: number;
  recommendations: string[];
}

class TrustControls {
  private trustRecords: Map<string, TrustRecord> = new Map();
  private defaultPolicy: PrivacyPolicy = {
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
  getTrustLevel(domain: string): TrustLevel {
    const record = this.trustRecords.get(domain);
    if (!record) {
      return 'neutral';
    }
    return record.trustLevel;
  }

  /**
   * Set trust level for domain
   */
  setTrustLevel(domain: string, level: TrustLevel): void {
    const existing = this.trustRecords.get(domain);
    const record: TrustRecord = {
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
  getPrivacyPolicy(domain: string): PrivacyPolicy {
    const trustLevel = this.getTrustLevel(domain);
    const policy = { ...this.defaultPolicy };

    // Adjust policy based on trust level
    if (trustLevel === 'trusted') {
      policy.allowTracking = true;
      policy.allowThirdPartyCookies = true;
      policy.blockAds = false;
      policy.blockTrackers = false;
    } else if (trustLevel === 'untrusted' || trustLevel === 'blocked') {
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
  async auditPrivacy(domain: string): Promise<PrivacyAudit> {
    // Use Tauri backend for privacy audit
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        const result = await window.__TAURI__.invoke('privacy_audit', { domain });
        return result as PrivacyAudit;
      } catch (error) {
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
  recordViolation(domain: string, violation: string): void {
    const record = this.trustRecords.get(domain);
    if (record) {
      if (!record.violations.includes(violation)) {
        record.violations.push(violation);
        record.privacyScore = Math.max(0, record.privacyScore - 10);
        record.trustLevel = this.updateTrustLevelFromScore(record.privacyScore);
        this.trustRecords.set(domain, record);
        this.saveToStorage();
      }
    } else {
      // Create new record
      const newRecord: TrustRecord = {
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
  private calculatePrivacyScore(level: TrustLevel): number {
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
  private updateTrustLevelFromScore(score: number): TrustLevel {
    if (score >= 80) return 'trusted';
    if (score >= 50) return 'neutral';
    if (score >= 20) return 'untrusted';
    return 'blocked';
  }

  /**
   * Get all trust records
   */
  getAllRecords(): TrustRecord[] {
    return Array.from(this.trustRecords.values());
  }

  /**
   * Clear trust records
   */
  clearRecords(): void {
    this.trustRecords.clear();
    this.saveToStorage();
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const records = Array.from(this.trustRecords.entries());
      localStorage.setItem('regen:trust-records', JSON.stringify(records));
    } catch (error) {
      console.error('[TrustControls] Failed to save to storage:', error);
    }
  }

  /**
   * Load from storage
   */
  loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('regen:trust-records');
      if (stored) {
        const records = JSON.parse(stored) as Array<[string, TrustRecord]>;
        this.trustRecords = new Map(records);
      }
    } catch (error) {
      console.error('[TrustControls] Failed to load from storage:', error);
    }
  }

  /**
   * Get privacy recommendations
   */
  getRecommendations(domain: string): string[] {
    const audit = this.auditPrivacy(domain);
    const recommendations: string[] = [];

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



