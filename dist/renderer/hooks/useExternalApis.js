/**
 * React hooks for External API adapters
 */
import { useCallback } from 'react';
import { getTradeAdapter } from '../services/adapters/TradeModeAdapter';
import { getResearchAdapter } from '../services/adapters/ResearchModeAdapter';
import { getThreatAdapter } from '../services/adapters/ThreatModeAdapter';
import { getImageAdapter } from '../services/adapters/ImageModeAdapter';
import { useExternalApisStore } from '../state/externalApisStore';
/**
 * Hook for Trade Mode API operations
 */
export function useTradeApis() {
    const adapter = getTradeAdapter();
    const enabledApis = useExternalApisStore(state => state.getEnabledApisForMode('trade'));
    return {
        getPrice: useCallback((symbol) => adapter.getPrice(symbol), [adapter]),
        getHistorical: useCallback((symbol, timeframe = '1d') => adapter.getHistorical(symbol, timeframe), [adapter]),
        getMarketNews: useCallback((symbol) => adapter.getMarketNews(symbol), [adapter]),
        enabledApis,
    };
}
/**
 * Hook for Research Mode API operations
 */
export function useResearchApis() {
    const adapter = getResearchAdapter();
    const enabledApis = useExternalApisStore(state => state.getEnabledApisForMode('research'));
    return {
        lookupDefinition: useCallback((word) => adapter.lookupDefinition(word), [adapter]),
        getSummary: useCallback((topicOrUrl) => adapter.getSummary(topicOrUrl), [adapter]),
        searchPapers: useCallback((query) => adapter.searchPapers(query), [adapter]),
        enabledApis,
    };
}
/**
 * Hook for Threat Mode API operations
 */
export function useThreatApis() {
    const adapter = getThreatAdapter();
    const enabledApis = useExternalApisStore(state => state.getEnabledApisForMode('threat'));
    return {
        analyzeUrl: useCallback((url) => adapter.analyzeUrl(url), [adapter]),
        checkIp: useCallback((ip) => adapter.checkIp(ip), [adapter]),
        combineScore: useCallback((urlAnalysis, ipAnalysis) => adapter.combineScore(urlAnalysis, ipAnalysis), [adapter]),
        enabledApis,
    };
}
/**
 * Hook for Image Mode API operations
 */
export function useImageApis() {
    const adapter = getImageAdapter();
    const enabledApis = useExternalApisStore(state => state.getEnabledApisForMode('image'));
    return {
        searchImages: useCallback((query, limit) => adapter.searchImages(query, limit), [adapter]),
        optimizeImage: useCallback((file) => adapter.optimizeImage(file), [adapter]),
        removeBackground: useCallback((file) => adapter.removeBackground(file), [adapter]),
        enabledApis,
    };
}
