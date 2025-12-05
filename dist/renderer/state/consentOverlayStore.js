import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
async function fetchRecords(filter) {
    const payload = {};
    if (filter.type && filter.type !== 'all') {
        payload.type = filter.type;
    }
    if (filter.status && filter.status !== 'all') {
        if (filter.status === 'pending') {
            payload.approved = false;
        }
        else if (filter.status === 'approved' || filter.status === 'revoked') {
            payload.approved = true;
        }
    }
    const list = await ipc.consent.list(Object.keys(payload).length > 0 ? payload : undefined);
    if (!Array.isArray(list)) {
        return [];
    }
    let filtered = list;
    if (filter.status === 'pending') {
        filtered = filtered.filter((record) => !record.approved);
    }
    else if (filter.status === 'approved') {
        filtered = filtered.filter((record) => record.approved && !record.revokedAt);
    }
    else if (filter.status === 'revoked') {
        filtered = filtered.filter((record) => Boolean(record.revokedAt));
    }
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
}
export const useConsentOverlayStore = create((set, get) => ({
    visible: false,
    loading: false,
    error: null,
    filter: { type: 'all', status: 'all' },
    records: [],
    async open() {
        if (!get().visible) {
            set({ visible: true });
        }
        await get().refresh();
    },
    close() {
        set({ visible: false });
    },
    async toggle() {
        if (get().visible) {
            set({ visible: false });
        }
        else {
            set({ visible: true });
            await get().refresh();
        }
    },
    async refresh() {
        set({ loading: true, error: null });
        try {
            const records = await fetchRecords(get().filter);
            set({ records, loading: false, error: null });
        }
        catch (error) {
            set({
                loading: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
    async setFilter(partial) {
        set((state) => ({ filter: { ...state.filter, ...partial } }));
        await get().refresh();
    },
    async approve(consentId) {
        await ipc.consent.approve(consentId);
        await get().refresh();
    },
    async revoke(consentId) {
        await ipc.consent.revoke(consentId);
        await get().refresh();
    },
}));
