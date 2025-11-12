import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
import type { IdentityCredential, IdentityRevealPayload, IdentityVaultSummary } from '../types/identity';

interface IdentityState {
  status: IdentityVaultSummary | null;
  credentials: IdentityCredential[];
  loading: boolean;
  error: string | null;
  revealingId: string | null;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => Promise<void>;
  refresh: () => Promise<void>;
  addCredential: (payload: { domain: string; username: string; secret: string; secretHint?: string | null; tags?: string[] }) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  revealCredential: (id: string) => Promise<IdentityRevealPayload | null>;
  setError: (message: string | null) => void;
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  status: null,
  credentials: [],
  loading: false,
  error: null,
  revealingId: null,
  async unlock(passphrase) {
    set({ loading: true, error: null });
    try {
      const summary = await ipc.identity.unlock(passphrase.trim());
      set({ status: summary });
      await get().refresh();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  async lock() {
    set({ loading: true, error: null });
    try {
      const summary = await ipc.identity.lock();
      set({ status: summary, credentials: [] });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  async refresh() {
    try {
      const status = await ipc.identity.status();
      set({ status });
      if (status.status === 'unlocked') {
        const list = await ipc.identity.list();
        set({ credentials: list });
      } else {
        set({ credentials: [] });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  async addCredential(payload) {
    set({ loading: true, error: null });
    try {
      await ipc.identity.add(payload);
      await get().refresh();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  async removeCredential(id) {
    set({ loading: true, error: null });
    try {
      await ipc.identity.remove(id);
      await get().refresh();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  async revealCredential(id) {
    if (get().revealingId) return null;
    set({ revealingId: id, error: null });
    try {
      const result = await ipc.identity.reveal(id);
      await get().refresh();
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      set({ revealingId: null });
    }
  },
  setError(message) {
    set({ error: message });
  },
}));

