/**
 * Redix Reducers
 * Deterministic state reducers for common Redix operations
 */
import { Reducer } from './event-log';
/**
 * Tab state reducer
 */
export declare const tabReducer: Reducer;
/**
 * Performance metrics reducer
 */
export declare const performanceReducer: Reducer;
/**
 * Policy reducer
 */
export declare const policyReducer: Reducer;
/**
 * AI-triggered optimization reducer
 */
export declare const aiOptimizationReducer: Reducer;
/**
 * Resource allocation reducer
 */
export declare const resourceReducer: Reducer;
/**
 * Register all default reducers
 */
export declare function registerDefaultReducers(): void;
