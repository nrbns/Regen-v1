/**
 * Safe LangChain Integration - Public API
 * 
 * CRITICAL: These are HELPERS, not autonomous agents.
 * Use them FROM tasks, not directly from UI.
 * 
 * Usage:
 * ```typescript
 * import { ControlledChain, ChainBuilder, PromptTemplate, OutputParser } from '@/core/ai/langchain';
 * 
 * // Build a controlled chain
 * const chain = new ChainBuilder()
 *   .model('step1', { prompt: 'Explain: {topic}' })
 *   .model('step2', { prompt: 'Summarize: {step1.output}', inputMapping: { text: 'step1.output' } })
 *   .build(executor);
 * 
 * // Use prompt templates
 * const template = new PromptTemplate('Summarize: {text}');
 * const prompt = template.format({ text: '...' });
 * 
 * // Parse outputs
 * const parsed = OutputParser.parseJSON(response);
 * ```
 */

export * from './ControlledChain';
export * from './SafeLangChainHelpers';
export { ChainBuilder } from './ControlledChain';
export { PromptTemplate, OutputParser, StreamingHelper, ToolRegistry, type Tool } from './SafeLangChainHelpers';
