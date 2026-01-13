/**
 * LLM/DLM Executor Interfaces - Public API
 * 
 * Usage:
 * ```typescript
 * import { executorRegistry } from '@/core/ai/executors';
 * 
 * const result = await executorRegistry.execute({
 *   taskType: 'summarize',
 *   prompt: 'Summarize this text...',
 *   context: { ... }
 * });
 * ```
 */

export * from './types';
export * from './LLMExecutor';
export * from './DLMExecutor';
export * from './ExecutorRegistry';
export { executorRegistry } from './ExecutorRegistry';
