/**
 * Trade Alerts Cron Service
 * Runs every 30 seconds to generate AI trading alerts
 * Persists alerts to localStorage for crash recovery
 * Supports multilingual alerts based on user language preference
 */
import { log } from '../utils/logger';
import { aiEngine } from '../core/ai';
// import type { AITaskResult } from '../core/ai'; // Reserved for future use
import { useSettingsStore } from '../state/settingsStore';
import { translateText } from '../core/offline/translator';
const ALERTS_STORAGE_KEY = 'regen_trade_alerts_v1';
const ALERT_INTERVAL_MS = 30000; // 30 seconds
const ALERT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
let cronInterval = null;
let isRunning = false;
let watchedSymbols = [];
let alertCallbacks = [];
/**
 * Load alerts from localStorage
 */
export function loadAlerts() {
    try {
        const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
        if (stored) {
            const alerts = JSON.parse(stored);
            // Filter out expired alerts
            const now = Date.now();
            return alerts.filter(alert => alert.expiresAt > now);
        }
    }
    catch (error) {
        log.warn('[TradeAlertsCron] Failed to load alerts from storage:', error);
    }
    return [];
}
/**
 * Save alerts to localStorage
 */
export function saveAlerts(alerts) {
    try {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    }
    catch (error) {
        log.warn('[TradeAlertsCron] Failed to save alerts to storage:', error);
    }
}
/**
 * Generate AI trading signal for a symbol
 */
async function generateAlertForSymbol(symbol, language) {
    try {
        // Get current price (mock for now, should use real API)
        const currentPrice = 150.0; // TODO: Get from real API
        // Generate AI signal using the AI engine
        const prompt = `Analyze ${symbol} stock. Provide a trading signal (buy/sell/hold) with confidence percentage and brief rationale. Format: ACTION|CONFIDENCE|RATIONALE`;
        const result = await aiEngine.runTask({
            kind: 'search',
            prompt,
            context: {
                symbol,
                currentPrice,
                timeframe: '1h',
            },
            mode: 'trade',
            llm: {
                temperature: 0.3,
                maxTokens: 200,
            },
        });
        if (!result.text) {
            return null;
        }
        // Parse AI response
        const parts = result.text.split('|');
        const action = (parts[0]?.toLowerCase().trim() || 'hold');
        const confidence = parseInt(parts[1]?.trim() || '50', 10);
        const rationale = parts[2]?.trim() || result.text;
        // Translate message to user's language if needed
        let message = `${symbol}: ${action.toUpperCase()} signal (${confidence}% confidence). ${rationale}`;
        if (language !== 'auto' && language !== 'en') {
            try {
                const translated = await translateText(message, language, 'en');
                message = translated.text;
            }
            catch (error) {
                log.warn('[TradeAlertsCron] Translation failed, using English:', error);
            }
        }
        const alert = {
            id: `alert-${symbol}-${Date.now()}`,
            symbol,
            action,
            confidence,
            message,
            price: currentPrice,
            timestamp: Date.now(),
            language,
            expiresAt: Date.now() + ALERT_EXPIRY_MS,
            acknowledged: false,
        };
        return alert;
    }
    catch (error) {
        log.error(`[TradeAlertsCron] Failed to generate alert for ${symbol}:`, error);
        return null;
    }
}
/**
 * Process alerts for all watched symbols
 */
async function processAlerts() {
    if (watchedSymbols.length === 0) {
        return;
    }
    const language = useSettingsStore.getState().language || 'auto';
    const alerts = [];
    // Generate alerts for each watched symbol
    for (const symbol of watchedSymbols) {
        try {
            const alert = await generateAlertForSymbol(symbol, language);
            if (alert) {
                alerts.push(alert);
            }
        }
        catch (error) {
            log.warn(`[TradeAlertsCron] Failed to process alert for ${symbol}:`, error);
        }
    }
    // Save new alerts
    if (alerts.length > 0) {
        const existingAlerts = loadAlerts();
        const allAlerts = [...existingAlerts, ...alerts];
        saveAlerts(allAlerts);
        // Notify callbacks
        for (const alert of alerts) {
            for (const callback of alertCallbacks) {
                try {
                    callback(alert);
                }
                catch (error) {
                    log.warn('[TradeAlertsCron] Callback error:', error);
                }
            }
        }
        log.info(`[TradeAlertsCron] Generated ${alerts.length} new alerts`);
    }
}
/**
 * Start the cron loop
 */
export function startTradeAlertsCron(symbols) {
    if (isRunning) {
        stopTradeAlertsCron();
    }
    watchedSymbols = [...symbols];
    isRunning = true;
    // Process immediately
    processAlerts().catch(error => {
        log.error('[TradeAlertsCron] Initial alert processing failed:', error);
    });
    // Set up interval
    cronInterval = setInterval(() => {
        if (isRunning) {
            processAlerts().catch(error => {
                log.error('[TradeAlertsCron] Periodic alert processing failed:', error);
            });
        }
    }, ALERT_INTERVAL_MS);
    log.info(`[TradeAlertsCron] Started with ${symbols.length} symbols, interval: ${ALERT_INTERVAL_MS}ms`);
}
/**
 * Stop the cron loop
 */
export function stopTradeAlertsCron() {
    if (cronInterval) {
        clearInterval(cronInterval);
        cronInterval = null;
    }
    isRunning = false;
    log.info('[TradeAlertsCron] Stopped');
}
/**
 * Update watched symbols
 */
export function updateWatchedSymbols(symbols) {
    watchedSymbols = [...symbols];
    log.debug(`[TradeAlertsCron] Updated watched symbols: ${symbols.join(', ')}`);
}
/**
 * Register callback for new alerts
 */
export function onAlert(callback) {
    alertCallbacks.push(callback);
    return () => {
        alertCallbacks = alertCallbacks.filter(cb => cb !== callback);
    };
}
/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId) {
    const alerts = loadAlerts();
    const updated = alerts.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert);
    saveAlerts(updated);
}
/**
 * Get unacknowledged alerts
 */
export function getUnacknowledgedAlerts() {
    const alerts = loadAlerts();
    return alerts.filter(alert => !alert.acknowledged);
}
/**
 * Clear expired alerts
 */
export function clearExpiredAlerts() {
    const alerts = loadAlerts();
    const now = Date.now();
    const active = alerts.filter(alert => alert.expiresAt > now);
    saveAlerts(active);
}
/**
 * Initialize cron service (call on app start)
 */
export function initTradeAlertsCron() {
    // Clear expired alerts on startup
    clearExpiredAlerts();
    // Auto-clear expired alerts every minute
    setInterval(clearExpiredAlerts, 60000);
    log.info('[TradeAlertsCron] Initialized');
}
