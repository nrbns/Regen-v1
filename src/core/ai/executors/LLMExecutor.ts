/**
 * LLM Executor - Text Language Model Processor
 * 
 * Executes text-based tasks: explain, summarize, translate, reason, etc.
 * 
 * CRITICAL: This is a PROCESSOR, not an autonomous agent.
 * Tasks call this, not the UI directly.
 */

import type {
  BaseExecutor,
  ExecutorInput,
  ExecutorResult,
  ExecutorCapabilities,
  LLMTaskType,
  StreamEvent,
  StreamHandler,
  ModelConfig,
} from './types';

export class LLMExecutor implements BaseExecutor {
  readonly type = 'llm' as const;

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    if (!input.prompt) {
      return {
        success: false,
        output: '',
        error: 'Prompt is required for LLM tasks',
      };
    }

    const startTime = Date.now();
    const config: ModelConfig = input.config || {
      provider: 'ollama',
      model: 'phi3:mini',
      temperature: 0.7,
      maxTokens: 2048,
    };

    try {
      // Build task-specific prompt
      const systemPrompt = this.buildSystemPrompt(input.taskType as LLMTaskType);
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${input.prompt}`
        : input.prompt;

      // Call backend API or use LLM service
      const apiBase = typeof window !== 'undefined' 
        ? (window as any).__API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
        : import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

      const response = await fetch(`${apiBase}/api/ai/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          payload: {
            model: config.model,
            messages: [{ role: 'user', content: fullPrompt }],
            temperature: config.temperature,
            max_tokens: config.maxTokens,
          },
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.text || data.response || data.content || '';

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: text,
        metadata: {
          duration,
          model: config.model,
          provider: config.provider,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error?.message || 'LLM execution failed',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  async executeStream(
    input: ExecutorInput,
    onStream: StreamHandler
  ): Promise<ExecutorResult> {
    if (!input.prompt) {
      return {
        success: false,
        output: '',
        error: 'Prompt is required for LLM tasks',
      };
    }

    const startTime = Date.now();
    const tokens: string[] = [];
    const config: ModelConfig = input.config || {
      provider: 'ollama',
      model: 'phi3:mini',
      temperature: 0.7,
      maxTokens: 2048,
    };

    try {
      const systemPrompt = this.buildSystemPrompt(input.taskType as LLMTaskType);
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${input.prompt}`
        : input.prompt;

      const apiBase = typeof window !== 'undefined' 
        ? (window as any).__API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
        : import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

      const response = await fetch(`${apiBase}/api/ai/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          payload: {
            model: config.model,
            messages: [{ role: 'user', content: fullPrompt }],
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            stream: true,
          },
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          tokens.push(chunk);
          onStream({ type: 'token', data: chunk });
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: tokens.join(''),
        metadata: {
          duration,
          model: config.model,
          provider: config.provider,
        },
      };
    } catch (error: any) {
      onStream({ type: 'error', data: error });
      return {
        success: false,
        output: '',
        error: error?.message || 'LLM execution failed',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Check if AI engine is available
    try {
      // Simple check - in production, ping the backend
      return typeof window !== 'undefined' || true; // Always available for now
    } catch {
      return false;
    }
  }

  getCapabilities(): ExecutorCapabilities {
    return {
      supportedTaskTypes: [
        'explain',
        'summarize',
        'translate',
        'reason',
        'extract',
        'classify',
        'generate',
      ],
      supportsStreaming: true,
      supportsFiles: false,
    };
  }

  /**
   * Build system prompt based on task type
   */
  private buildSystemPrompt(taskType: LLMTaskType): string {
    const prompts: Record<LLMTaskType, string> = {
      explain: 'You are a helpful assistant that explains concepts clearly and concisely.',
      summarize: 'You are a summarization assistant. Provide clear, concise summaries.',
      translate: 'You are a translation assistant. Translate accurately while preserving meaning.',
      reason: 'You are a reasoning assistant. Think step-by-step and explain your reasoning.',
      extract: 'You are an extraction assistant. Extract requested information accurately.',
      classify: 'You are a classification assistant. Classify content accurately.',
      generate: 'You are a content generation assistant. Generate relevant, useful content.',
    };

    return prompts[taskType] || '';
  }
}
