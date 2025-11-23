import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, _get) => ({
      symbols: [],
      addSymbol: entry =>
        set(state => {
          const exists = state.symbols.some(
            item => item.symbol.toUpperCase() === entry.symbol.toUpperCase()
          );
          if (exists) return state;
          return {
            symbols: [
              ...state.symbols,
              { ...entry, symbol: entry.symbol.toUpperCase(), addedAt: entry.addedAt },
            ],
          };
        }),
      removeSymbol: symbol =>
        set(state => ({
          symbols: state.symbols.filter(item => item.symbol.toUpperCase() !== symbol.toUpperCase()),
        })),
      clear: () => set({ symbols: [] }),
      reorder: symbols => set({ symbols }),
      updateMeta: (symbol, meta) =>
        set(state => ({
          symbols: state.symbols.map(item =>
            item.symbol.toUpperCase() === symbol.toUpperCase() ? { ...item, ...meta } : item
          ),
        })),
    }),
    {
      name: 'trade-watchlist-store-v1',
      version: 1,
      partialize: state => ({ symbols: state.symbols }),
    }
  )
);
