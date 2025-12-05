export interface TradeQuote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    previousClose?: number;
    volume?: number;
    updatedAt: number;
    sparkline: number[];
    sentiment?: 'bullish' | 'neutral' | 'bearish';
}
export declare function fetchTradeQuote(symbol: string): Promise<TradeQuote>;
