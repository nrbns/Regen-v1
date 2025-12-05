import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
import { isElectronRuntime } from '../lib/env';
async function safeCall(callback) {
    try {
        return await callback();
    }
    catch (error) {
        console.warn('[trust-dashboard] call failed', error);
        return undefined;
    }
}
export const useTrustDashboardStore = create((set, get) => ({
    visible: false,
    loading: false,
    error: null,
    consentTimeline: [],
    trustSignals: [],
    shieldsStatus: null,
    privacyAudit: null,
    consentStats: {
        total: 0,
        pending: 0,
        approved: 0,
        revoked: 0,
    },
    blockedSummary: {
        trackers: 0,
        ads: 0,
        upgrades: 0,
    },
    lastUpdated: null,
    async open() {
        if (!get().visible) {
            set({ visible: true });
        }
        await get().refresh();
    },
    close() {
        set({ visible: false });
    },
    async refresh() {
        if (!isElectronRuntime()) {
            set({
                loading: false,
                error: null,
                consentTimeline: [],
                trustSignals: [],
                shieldsStatus: null,
                privacyAudit: null,
                consentStats: {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    revoked: 0,
                },
                blockedSummary: {
                    trackers: 0,
                    ads: 0,
                    upgrades: 0,
                },
                lastUpdated: Date.now(),
            });
            return;
        }
        set({ loading: true, error: null });
        try {
            const [{ records: trustRecords } = { records: [] }, consentRecordsRaw, shieldsStatus, privacyAudit] = await Promise.all([
                safeCall(() => ipc.trust.list()),
                safeCall(() => ipc.consent.list()),
                safeCall(() => ipc.shields.getStatus()),
                safeCall(() => ipc.privacy.sentinel.audit()),
            ]);
            const consentRecords = Array.isArray(consentRecordsRaw) ? consentRecordsRaw : [];
            const consentStats = consentRecords.reduce((stats, record) => {
                stats.total += 1;
                if (record.approved && !record.revokedAt) {
                    stats.approved += 1;
                }
                else if (record.revokedAt) {
                    stats.revoked += 1;
                }
                else {
                    stats.pending += 1;
                }
                return stats;
            }, { total: 0, pending: 0, approved: 0, revoked: 0 });
            const consentTimeline = [...consentRecords].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
            const trustSignals = Array.isArray(trustRecords)
                ? [...trustRecords].sort((a, b) => {
                    if (a.verdict === b.verdict) {
                        return b.score - a.score;
                    }
                    const order = { trusted: 2, caution: 1, risk: 0 };
                    return order[b.verdict] - order[a.verdict];
                })
                : [];
            const blockedSummary = {
                trackers: shieldsStatus?.trackersBlocked ?? 0,
                ads: shieldsStatus?.adsBlocked ?? 0,
                upgrades: shieldsStatus?.httpsUpgrades ?? 0,
            };
            set({
                loading: false,
                consentTimeline,
                trustSignals,
                shieldsStatus: shieldsStatus ?? null,
                privacyAudit: privacyAudit ?? null,
                consentStats,
                blockedSummary,
                lastUpdated: Date.now(),
            });
        }
        catch (error) {
            set({
                loading: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
}));
