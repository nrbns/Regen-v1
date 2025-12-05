import { create } from 'zustand';
export const useTradeStore = create((set) => ({
    sidebarOpen: false,
    activeSymbol: 'AAPL',
    watchlist: ['AAPL', 'TSLA', 'NVDA'],
    quotes: {},
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
    addToWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol],
    })),
    updateQuote: (symbol, quote) => set((state) => ({
        quotes: {
            ...state.quotes,
            [symbol]: quote,
        },
    })),
}));
