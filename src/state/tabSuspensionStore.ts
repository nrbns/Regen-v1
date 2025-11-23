import { create } from 'zustand';

export type SuspensionReason = 'inactivity' | 'manual' | 'memory';

export interface SuspendedTabRecord {
  tabId: string;
  title?: string;
  url?: string;
  snapshot?: string | null;
  suspendedAt: number;
  lastActiveAt?: number;
  acknowledged?: boolean;
  reason?: SuspensionReason;
}

interface SuspensionEvent {
  tabId: string;
  type: 'suspended' | 'restored';
  timestamp: number;
  reason?: SuspensionReason;
}

interface TabSuspensionState {
  suspensions: Record<string, SuspendedTabRecord>;
  lastEvent?: SuspensionEvent;
  setSuspended: (record: SuspendedTabRecord) => void;
  acknowledge: (tabId: string) => void;
  resolve: (tabId: string, options?: { silent?: boolean }) => void;
}

export const useTabSuspensionStore = create<TabSuspensionState>(set => ({
  suspensions: {},
  lastEvent: undefined,
  setSuspended: record =>
    set(state => ({
      suspensions: {
        ...state.suspensions,
        [record.tabId]: {
          ...(state.suspensions[record.tabId] ?? {}),
          ...record,
          acknowledged: false,
        },
      },
      lastEvent: {
        tabId: record.tabId,
        type: 'suspended',
        timestamp: Date.now(),
        reason: record.reason,
      },
    })),
  acknowledge: tabId =>
    set(state => {
      const current = state.suspensions[tabId];
      if (!current) {
        return state;
      }
      return {
        suspensions: {
          ...state.suspensions,
          [tabId]: {
            ...current,
            acknowledged: true,
          },
        },
      };
    }),
  resolve: (tabId, options) =>
    set(state => {
      if (!state.suspensions[tabId]) {
        return state;
      }
      const next = { ...state.suspensions };
      delete next[tabId];
      return {
        suspensions: next,
        lastEvent: options?.silent
          ? state.lastEvent
          : {
              tabId,
              type: 'restored',
              timestamp: Date.now(),
            },
      };
    }),
}));
