import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
import type { ShadowSessionSummaryEvent, ShadowSessionEndedEvent } from '../lib/ipc-events';

type ShadowState = {
  activeSessionId: string | null;
  windowId: number | null;
  loading: boolean;
  error: string | null;
  summary: ShadowSessionSummaryEvent | null;
  startShadowSession: (options?: { url?: string; persona?: string; summary?: boolean }) => Promise<void>;
  endShadowSession: (options?: { forensic?: boolean }) => Promise<void>;
  handleSessionEnded: (payload: ShadowSessionEndedEvent) => void;
  clearSummary: () => void;
  setError: (error: string | null) => void;
};

export const useShadowStore = create<ShadowState>((set, get) => ({
  activeSessionId: null,
  windowId: null,
  loading: false,
  error: null,
  summary: null,
  async startShadowSession(options) {
    if (get().loading) return;
    set({ loading: true, error: null, summary: null });
    try {
      const response = await ipc.private.createShadowSession(options ?? {});
      if (!response || typeof response !== 'object') {
        throw new Error('Shadow session failed to start');
      }
      const sessionResponse = response as { sessionId?: string | null; windowId?: number | null };
      set({
        activeSessionId: sessionResponse.sessionId ?? null,
        windowId: typeof sessionResponse.windowId === 'number' ? sessionResponse.windowId : null,
        loading: false,
        summary: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
  async endShadowSession(options) {
    const sessionId = get().activeSessionId;
    if (!sessionId) return;
    set({ loading: true, error: null });
    try {
      const response = await ipc.private.endShadowSession(sessionId, options);
      const endResponse = response as { summary?: ShadowSessionSummaryEvent | null } | null;
      set({
        activeSessionId: null,
        windowId: null,
        loading: false,
        summary: endResponse?.summary ?? null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
  handleSessionEnded(payload) {
    set((state) => {
      const shouldClear = state.activeSessionId === payload.sessionId;
      return {
        activeSessionId: shouldClear ? null : state.activeSessionId,
        windowId: shouldClear ? null : state.windowId,
        loading: false,
        summary: payload.summary ?? null,
      };
    });
  },
  clearSummary() {
    set({ summary: null });
  },
  setError(error) {
    set({ error });
  },
}));


