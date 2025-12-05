export type WatchlistInstrumentType = 'stock' | 'crypto' | 'fund' | 'forex' | 'other';
export type WatchlistSymbol = {
    symbol: string;
    name?: string;
    exchange?: string;
    type?: WatchlistInstrumentType;
    addedAt: number;
};
type WatchlistState = {
    symbols: WatchlistSymbol[];
    addSymbol: (entry: WatchlistSymbol) => void;
    removeSymbol: (symbol: string) => void;
    clear: () => void;
    reorder: (symbols: WatchlistSymbol[]) => void;
    updateMeta: (symbol: string, meta: Partial<WatchlistSymbol>) => void;
};
export declare const useWatchlistStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<WatchlistState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<WatchlistState, {
            symbols: WatchlistSymbol[];
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: WatchlistState) => void) => () => void;
        onFinishHydration: (fn: (state: WatchlistState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<WatchlistState, {
            symbols: WatchlistSymbol[];
        }>>;
    };
}>;
export {};
