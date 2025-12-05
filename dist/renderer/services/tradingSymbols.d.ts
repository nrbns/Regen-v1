export type SymbolResult = {
    symbol: string;
    name: string;
    exchange: string;
    region?: string;
    currency?: string;
    type: 'stock' | 'crypto' | 'fund' | 'forex' | 'other';
};
export declare function searchTradingSymbols(query: string): Promise<SymbolResult[]>;
