import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useIdentityStore = create((set, get) => ({
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
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            set({ loading: false });
        }
    },
    async lock() {
        set({ loading: true, error: null });
        try {
            const summary = await ipc.identity.lock();
            set({ status: summary, credentials: [] });
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
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
            }
            else {
                set({ credentials: [] });
            }
        }
        catch (error) {
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
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            set({ loading: false });
        }
    },
    async removeCredential(id) {
        set({ loading: true, error: null });
        try {
            await ipc.identity.remove(id);
            await get().refresh();
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            set({ loading: false });
        }
    },
    async revealCredential(id) {
        if (get().revealingId)
            return null;
        set({ revealingId: id, error: null });
        try {
            const result = await ipc.identity.reveal(id);
            await get().refresh();
            return result;
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
        finally {
            set({ revealingId: null });
        }
    },
    setError(message) {
        set({ error: message });
    },
}));
