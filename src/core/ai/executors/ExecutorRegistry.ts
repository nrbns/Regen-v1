/**
 * Executor Registry - Central registry for all model executors
 * 
 * Provides unified interface to access LLM/DLM executors
 * Used by tasks, not directly by UI
 */

import type { BaseExecutor, ExecutorInput, ExecutorResult, StreamHandler } from './types';
import { LLMExecutor } from './LLMExecutor';
import { DLMExecutor } from './DLMExecutor';
import { AIEngine } from '../engine';

export class ExecutorRegistry {
  private static instance: ExecutorRegistry;
  private executors: Map<string, BaseExecutor> = new Map();

  private constructor() {
    // Initialize default executors
    const aiEngine = new AIEngine();
    this.register('llm', new LLMExecutor(aiEngine));
    this.register('dlm', new DLMExecutor());
  }

  static getInstance(): ExecutorRegistry {
    if (!ExecutorRegistry.instance) {
      ExecutorRegistry.instance = new ExecutorRegistry();
    }
    return ExecutorRegistry.instance;
  }

  /**
   * Register an executor
   */
  register(type: string, executor: BaseExecutor): void {
    this.executors.set(type, executor);
  }

  /**
   * Get an executor by type
   */
  getExecutor(type: 'llm' | 'dlm' | 'vlm'): BaseExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * Execute a task using the appropriate executor
   */
  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    // Determine executor type from task type
    const executorType = this.determineExecutorType(input.taskType);
    const executor = this.getExecutor(executorType);

    if (!executor) {
      return {
        success: false,
        output: '',
        error: `No executor available for type: ${executorType}`,
      };
    }

    // Check availability
    const available = await executor.isAvailable();
    if (!available) {
      return {
        success: false,
        output: '',
        error: `Executor ${executorType} is not available`,
      };
    }

    // Execute
    return executor.execute(input);
  }

  /**
   * Execute with streaming
   */
  async executeStream(
    input: ExecutorInput,
    onStream: StreamHandler
  ): Promise<ExecutorResult> {
    const executorType = this.determineExecutorType(input.taskType);
    const executor = this.getExecutor(executorType);

    if (!executor) {
      return {
        success: false,
        output: '',
        error: `No executor available for type: ${executorType}`,
      };
    }

    const available = await executor.isAvailable();
    if (!available) {
      return {
        success: false,
        output: '',
        error: `Executor ${executorType} is not available`,
      };
    }

    return executor.executeStream(input, onStream);
  }

  /**
   * Determine executor type from task type
   */
  private determineExecutorType(
    taskType: string
  ): 'llm' | 'dlm' | 'vlm' {
    const dlmTasks = [
      'extract_text',
      'extract_tables',
      'extract_metadata',
      'analyze_structure',
      'extract_entities',
      'summarize_document',
      'answer_question',
    ];

    if (dlmTasks.includes(taskType)) {
      return 'dlm';
    }

    // Default to LLM for text tasks
    return 'llm';
  }

  /**
   * Get all available executors
   */
  async getAvailableExecutors(): Promise<string[]> {
    const available: string[] = [];
    
    for (const [type, executor] of this.executors.entries()) {
      if (await executor.isAvailable()) {
        available.push(type);
      }
    }
    
    return available;
  }
}

// Export singleton instance
export const executorRegistry = ExecutorRegistry.getInstance();
