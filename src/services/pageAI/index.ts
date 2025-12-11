/**
 * Page AI Module
 * Main exports for page AI services
 */

export { summarizePage, summarizeSelection } from './summarizer';
export type { PageSummary, SummaryOptions } from './summarizer';

export { explainPage, explainText } from './explainer';
export type { PageExplanation, ExplanationOptions } from './explainer';

export { translateText, detectLanguage } from './translator';
export type { TranslationOptions } from './translator';

export { extractTasks } from './taskExtractor';
export type { ExtractedTask, ExtractionResult } from './taskExtractor';

