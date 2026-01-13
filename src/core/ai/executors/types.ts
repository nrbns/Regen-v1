/**
 * LLM/DLM Executor Interfaces for Regen
 * 
 * CRITICAL RULE: Models never decide. Tasks decide.
 * Models are called INSIDE tasks, never directly from UI.
 * 
 * Architecture:
 * User → Task → Executor → Model (LLM/DLM) → Output → UI
 */

export type ModelType = 'llm' | 'dlm' | 'vlm';

export type LLMTaskType =
  | 'explain'
  | 'summarize'
  | 'translate'
  | 'reason'
  | 'extract'
  | 'classify'
  | 'generate';

export type DLMTaskType =
  | 'extract_text'
  | 'extract_tables'
  | 'extract_metadata'
  | 'analyze_structure'
  | 'extract_entities'
  | 'summarize_document'
  | 'answer_question';

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'local';
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface StreamEvent {
  type: 'token' | 'done' | 'error';
  data: string | Error;
  metadata?: Record<string, any>;
}

export type StreamHandler = (event: StreamEvent) => void;

/**
 * Base executor interface - all executors must implement this
 */
export interface BaseExecutor {
  readonly type: ModelType;
  
  /**
   * Execute a task synchronously
   */
  execute(input: ExecutorInput): Promise<ExecutorResult>;
  
  /**
   * Execute a task with streaming
   */
  executeStream(
    input: ExecutorInput,
    onStream: StreamHandler
  ): Promise<ExecutorResult>;
  
  /**
   * Check if executor is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get executor capabilities
   */
  getCapabilities(): ExecutorCapabilities;
}

/**
 * Input for executor
 */
export interface ExecutorInput {
  taskType: LLMTaskType | DLMTaskType;
  prompt?: string;
  content?: string | Buffer | File;
  context?: Record<string, any>;
  config?: ModelConfig;
  signal?: AbortSignal;
}

/**
 * Result from executor
 */
export interface ExecutorResult {
  success: boolean;
  output: string | Record<string, any>;
  metadata?: {
    tokensUsed?: number;
    duration?: number;
    model?: string;
    provider?: string;
    cost?: number;
  };
  error?: string;
}

/**
 * Executor capabilities
 */
export interface ExecutorCapabilities {
  supportedTaskTypes: (LLMTaskType | DLMTaskType)[];
  supportsStreaming: boolean;
  supportsFiles: boolean;
  maxFileSize?: number;
  supportedFormats?: string[];
}
