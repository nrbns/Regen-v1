import { create } from 'zustand';
import { TradeQuote } from '../core/trade/dataService';

interface TradeState {
  sidebarOpen: boolean;
  activeSymbol: string;
  watchlist: string[];
  quotes: Record<string, TradeQuote | undefined>;
  setSidebarOpen: (open: boolean) => void;
  setActiveSymbol: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
  updateQuote: (symbol: string, quote: TradeQuote) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  sidebarOpen: false,
  activeSymbol: 'AAPL',
  watchlist: ['AAPL', 'TSLA', 'NVDA'],
  quotes: {},
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
  addToWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol],
    })),
  updateQuote: (symbol, quote) =>
    set((state) => ({
      quotes: {
        ...state.quotes,
        [symbol]: quote,
      },
    })),
}));


