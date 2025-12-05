import { create } from 'zustand';
const MAX_HISTORY = 200;
export const useMemoryStore = create(set => ({
    history: [],
    latest: undefined,
    capacityMB: undefined,
    pushSnapshot: snapshot => set(state => {
        const history = [...state.history, snapshot].slice(-MAX_HISTORY);
        return {
            latest: snapshot,
            history,
        };
    }),
    setCapacity: capacity => set(() => ({
        capacityMB: capacity,
    })),
}));
