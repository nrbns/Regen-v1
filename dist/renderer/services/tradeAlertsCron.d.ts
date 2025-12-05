/**
 * Trade Alerts Cron Service
 * Runs every 30 seconds to generate AI trading alerts
 * Persists alerts to localStorage for crash recovery
 * Supports multilingual alerts based on user language preference
 */
export interface TradeAlert {
    id: string;
    symbol: string;
    action: 'buy' | 'sell' | 'hold' | 'close';
    confidence: number;
    message: string;
    price: number;
    timestamp: number;
    language: string;
    expiresAt: number;
    acknowledged: boolean;
}
/**
 * Load alerts from localStorage
 */
export declare function loadAlerts(): TradeAlert[];
/**
 * Save alerts to localStorage
 */
export declare function saveAlerts(alerts: TradeAlert[]): void;
/**
 * Start the cron loop
 */
export declare function startTradeAlertsCron(symbols: string[]): void;
/**
 * Stop the cron loop
 */
export declare function stopTradeAlertsCron(): void;
/**
 * Update watched symbols
 */
export declare function updateWatchedSymbols(symbols: string[]): void;
/**
 * Register callback for new alerts
 */
export declare function onAlert(callback: (alert: TradeAlert) => void): () => void;
/**
 * Acknowledge an alert
 */
export declare function acknowledgeAlert(alertId: string): void;
/**
 * Get unacknowledged alerts
 */
export declare function getUnacknowledgedAlerts(): TradeAlert[];
/**
 * Clear expired alerts
 */
export declare function clearExpiredAlerts(): void;
/**
 * Initialize cron service (call on app start)
 */
export declare function initTradeAlertsCron(): void;
