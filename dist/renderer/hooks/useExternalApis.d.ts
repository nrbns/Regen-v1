/**
 * React hooks for External API adapters
 */
/**
 * Hook for Trade Mode API operations
 */
export declare function useTradeApis(): {
    getPrice: (symbol: string) => Promise<import("../services/adapters").PriceData>;
    getHistorical: (symbol: string, timeframe?: "1d" | "1w" | "1m" | "1y") => Promise<import("../services/adapters").HistoricalData>;
    getMarketNews: (symbol?: string) => Promise<import("../services/adapters").MarketNews[]>;
    enabledApis: import("../config/externalApis").ExternalAPI[];
};
/**
 * Hook for Research Mode API operations
 */
export declare function useResearchApis(): {
    lookupDefinition: (word: string) => Promise<import("../services/adapters").WordDefinition>;
    getSummary: (topicOrUrl: string) => Promise<import("../services/adapters").Summary>;
    searchPapers: (query: string) => Promise<import("../services/adapters").Paper[]>;
    enabledApis: import("../config/externalApis").ExternalAPI[];
};
/**
 * Hook for Threat Mode API operations
 */
export declare function useThreatApis(): {
    analyzeUrl: (url: string) => Promise<import("../services/adapters").UrlAnalysis>;
    checkIp: (ip: string) => Promise<import("../services/adapters").IpAnalysis>;
    combineScore: (urlAnalysis?: any, ipAnalysis?: any) => import("../services/adapters").ThreatScore;
    enabledApis: import("../config/externalApis").ExternalAPI[];
};
/**
 * Hook for Image Mode API operations
 */
export declare function useImageApis(): {
    searchImages: (query: string, limit?: number) => Promise<import("../services/adapters").ImageResult[]>;
    optimizeImage: (file: File | Blob) => Promise<import("../services/adapters").OptimizedImage>;
    removeBackground: (file: File | Blob) => Promise<import("../services/adapters").BackgroundRemovedImage>;
    enabledApis: import("../config/externalApis").ExternalAPI[];
};
