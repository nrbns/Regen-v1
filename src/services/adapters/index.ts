/**
 * Adapter exports
 */

export {
  TradeModeAdapter,
  getTradeAdapter,
  type PriceData,
  type HistoricalData,
  type MarketNews,
} from './TradeModeAdapter';
export {
  ResearchModeAdapter,
  getResearchAdapter,
  type WordDefinition,
  type Summary,
  type Paper,
} from './ResearchModeAdapter';
export {
  ThreatModeAdapter,
  getThreatAdapter,
  type UrlAnalysis,
  type IpAnalysis,
  type ThreatScore,
} from './ThreatModeAdapter';
export {
  ImageModeAdapter,
  getImageAdapter,
  type ImageResult,
  type OptimizedImage,
  type BackgroundRemovedImage,
} from './ImageModeAdapter';

