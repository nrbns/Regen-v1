import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
import { isElectronRuntime } from '../lib/env';
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

async function safeCall<T>(callback: () => Promise<T>): Promise<T | undefined> {
  try {
    return await callback();
  } catch (error) {
    console.warn('[trust-dashboard] call failed', error);
    return undefined;
  }
}

export const useTrustDashboardStore = create<TrustDashboardState>((set, get) => ({
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
      const [trustResult, consentRecordsRaw, shieldsStatus, privacyAudit] = await Promise.all([
        safeCall(() => ipc.trust.list()),
        safeCall(() => ipc.consent.list()),
        safeCall(() => ipc.shields.getStatus()),
        safeCall(() => ipc.privacy.sentinel.audit()),
      ]);
      const trustRecords = (trustResult as any)?.records || [];

      const consentRecords = Array.isArray(consentRecordsRaw) ? consentRecordsRaw : [];
      const consentStats = consentRecords.reduce<ConsentStats>(
        (stats, record) => {
          stats.total += 1;
          if (record.approved && !record.revokedAt) {
            stats.approved += 1;
          } else if (record.revokedAt) {
            stats.revoked += 1;
          } else {
            stats.pending += 1;
          }
          return stats;
        },
        { total: 0, pending: 0, approved: 0, revoked: 0 },
      );

      const consentTimeline = [...consentRecords].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

      const trustSignals = Array.isArray(trustRecords)
        ? [...trustRecords].sort((a, b) => {
            if (a.verdict === b.verdict) {
              return b.score - a.score;
            }
            const order = { trusted: 2, caution: 1, risk: 0 } as const;
            const aVerdict = (a.verdict as keyof typeof order) || 'risk';
            const bVerdict = (b.verdict as keyof typeof order) || 'risk';
            return order[bVerdict] - order[aVerdict];
          })
        : [];

      const blockedSummary: BlockedSummary = {
        trackers: (shieldsStatus as any)?.trackersBlocked ?? 0,
        ads: (shieldsStatus as any)?.adsBlocked ?? 0,
        upgrades: (shieldsStatus as any)?.httpsUpgrades ?? 0,
      };

      set({
        loading: false,
        consentTimeline,
        trustSignals,
        shieldsStatus: (shieldsStatus as any) ?? undefined,
        privacyAudit: (privacyAudit as any) ?? undefined,
        consentStats,
        blockedSummary,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));

