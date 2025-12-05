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
export declare const useTradeStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TradeState>>;
export {};
