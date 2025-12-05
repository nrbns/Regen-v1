import type { ConsentRecord } from '../types/consent';
import type { TrustSummary } from '../types/trustWeaver';
import type { PrivacyAuditSummary } from '../lib/ipc-events';
type ShieldsStatus = {
    adsBlocked: number;
    trackersBlocked: number;
    httpsUpgrades: number;
    cookies3p: 'block' | 'allow';
    webrtcBlocked: boolean;
    fingerprinting: boolean;
} | null;
type ConsentStats = {
    total: number;
    pending: number;
    approved: number;
    revoked: number;
};
type BlockedSummary = {
    trackers: number;
    ads: number;
    upgrades: number;
};
interface TrustDashboardState {
    visible: boolean;
    loading: boolean;
    error: string | null;
    consentTimeline: ConsentRecord[];
    trustSignals: TrustSummary[];
    shieldsStatus: ShieldsStatus;
    privacyAudit: PrivacyAuditSummary | null;
    consentStats: ConsentStats;
    blockedSummary: BlockedSummary;
    lastUpdated: number | null;
    open: () => Promise<void>;
    close: () => void;
    refresh: () => Promise<void>;
}
export declare const useTrustDashboardStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TrustDashboardState>>;
export {};
