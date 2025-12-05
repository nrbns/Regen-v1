/**
 * Trade Adapter - Unified interface for trading with risk engine
 * PR: Enhanced trade adapter with risk checks
 */
export interface TradeOrder {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    orderType: 'market' | 'limit' | 'stop';
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
}
export interface TradeResult {
    orderId: string;
    success: boolean;
    filledQuantity?: number;
    averagePrice?: number;
    error?: string;
    timestamp: number;
}
export interface RiskCheckResult {
    allowed: boolean;
    reason?: string;
    warnings: string[];
}
export interface AccountState {
    balance: number;
    equity: number;
    marginUsed: number;
    positions: Array<{
        symbol: string;
        quantity: number;
        avgPrice: number;
    }>;
}
declare const ledger: Array<{
    orderId: string;
    order: TradeOrder;
    result: TradeResult;
    timestamp: number;
}>;
/**
 * Risk check engine
 */
export declare function riskCheck(order: TradeOrder, accountState?: AccountState): RiskCheckResult;
/**
 * Place order (paper trading by default)
 */
export declare function placeOrder(order: TradeOrder): Promise<TradeResult>;
/**
 * Get account state
 */
export declare function getAccountState(): AccountState;
/**
 * Get trade ledger (recent trades)
 */
export declare function getLedger(limit?: number): typeof ledger;
/**
 * Clear ledger (for testing)
 */
export declare function clearLedger(): void;
export {};
